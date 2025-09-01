// THE DARK PLAN — minimal join-only WebRTC client using Socket.IO signaling
(() => {
  const $ = (s) => document.querySelector(s);
  const roomInput = $('#roomId');
  const nameInput = $('#displayName');
  const joinBtn = $('#joinBtn');
  const leaveBtn = $('#leaveBtn');
  const statusEl = $('#status');
  const timerEl = $('#timer');
  const peersList = $('#peers');
  const logEl = $('#log');
  const audioMount = $('#audioMount') || document.body;

  if (!roomInput.value) roomInput.value = 'dark-' + Math.random().toString(36).slice(2, 8);
  if (!nameInput.value) nameInput.value = 'Guest-' + Math.random().toString(36).slice(2, 4);

  const socket = io({ path: '/socket.io', transports: ['websocket','polling'], withCredentials:true });

  let localStream = null;
  let callStart = null;
  let timerHandle = null;
  let inCall = false;
  let rtcConfig = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

  const myId = (crypto.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now());
  let myName = nameInput.value.trim() || 'Guest';
  let room = roomInput.value.trim();

  // peers map: peerId -> { pc, audioEl, displayName }
  const peers = {};

  // --- UI helpers ---
  function log(msg) {
    console.log('[dark]', msg);
    if (!logEl) return;
    logEl.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function setStatus(t) { statusEl && (statusEl.textContent = t); }
  function startTimer() {
    callStart = Date.now();
    timerHandle = setInterval(()=>{
      const s = Math.floor((Date.now() - callStart)/1000);
      const mm = String(Math.floor(s/60)).padStart(2,'0');
      const ss = String(s%60).padStart(2,'0');
      timerEl && (timerEl.textContent = `${mm}:${ss}`);
    },1000);
  }
  function stopTimer() { if (timerHandle) clearInterval(timerHandle); timerEl && (timerEl.textContent='00:00'); }
  function updatePeersUI() {
    if (!peersList) return;
    peersList.innerHTML = '';
    const self = document.createElement('li');
    self.textContent = `🟢 ${(nameInput.value || myName)}`;
    peersList.appendChild(self);
    for (const [pid, info] of Object.entries(peers)) {
      const li = document.createElement('li');
      li.textContent = `🟢 ${info.displayName || ('Peer ' + pid.slice(0,4))}`;
      peersList.appendChild(li);
    }
  }

  // --- core ---
  async function loadICE(){
    try {
      const r = await fetch('/config.json', { cache:'no-store' });
      const j = await r.json();
      if (Array.isArray(j.iceServers) && j.iceServers.length) rtcConfig.iceServers = j.iceServers;
      log('Loaded ICE config');
    } catch { log('Default ICE'); }
  }

  async function getMic(){
    if (localStream) return localStream;
    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }, video:false });
    return localStream;
  }

  function shouldIOffer(otherId){ return myId < otherId; } // glare avoidance

  function removePeer(pid, reason=''){
    const p = peers[pid];
    if (!p) return;
    try { p.pc && p.pc.close(); } catch {}
    if (p.audioEl) { try { p.audioEl.srcObject = null; } catch {} p.audioEl.remove(); }
    delete peers[pid];
    updatePeersUI();
    log(`Peer ${pid.slice(0,6)} ${reason}`);
  }

  function createPC(targetPeerId){
    const pc = new RTCPeerConnection(rtcConfig);
    pc.onicecandidate = (e)=>{
      if (e.candidate) socket.emit('signal', { roomId: room, target: targetPeerId, from: myId, data: e.candidate });
    };
    pc.ontrack = (e)=>{
      let p = peers[targetPeerId] || (peers[targetPeerId] = { pc, audioEl:null, displayName:'Guest' });
      if (!p.audioEl){
        const audio = document.createElement('audio');
        audio.autoplay = true; audio.playsInline = true; audio.srcObject = e.streams[0];
        audioMount.appendChild(audio);
        p.audioEl = audio;
        updatePeersUI();
      }
    };
    pc.onconnectionstatechange = ()=>{
      const s = pc.connectionState;
      if (['failed','disconnected','closed'].includes(s)) removePeer(targetPeerId, `(${s})`);
    };
    return pc;
  }

  async function offerTo(targetPeerId, displayName){
    const p = (peers[targetPeerId] = peers[targetPeerId] || { pc:null, audioEl:null, displayName });
    if (!p.pc){
      p.pc = createPC(targetPeerId);
      const stream = await getMic();
      for (const t of stream.getTracks()) p.pc.addTrack(t, stream);
    }
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    socket.emit('signal', { roomId: room, target: targetPeerId, from: myId, data: p.pc.localDescription });
  }

  async function handleSignal(from, data){
    let p = peers[from];
    if (!p) p = peers[from] = { pc:null, audioEl:null, displayName:'Guest' };
    if (!p.pc){
      p.pc = createPC(from);
      const stream = await getMic();
      for (const t of stream.getTracks()) p.pc.addTrack(t, stream);
    }
    if (data.type === 'offer'){
      await p.pc.setRemoteDescription(data);
      const ans = await p.pc.createAnswer();
      await p.pc.setLocalDescription(ans);
      socket.emit('signal', { roomId: room, target: from, from: myId, data: p.pc.localDescription });
    } else if (data.type === 'answer'){
      await p.pc.setRemoteDescription(data);
    } else if (data.candidate){
      try { await p.pc.addIceCandidate(data); } catch (e) { console.warn('ICE add failed', e); }
    }
  }

  async function join(){
    room = roomInput.value.trim();
    myName = nameInput.value.trim() || 'Guest';
    if (!room) return alert('Enter a Meeting ID');

    try {
      await loadICE();
      await getMic(); // prompt mic permission on click
    } catch(e){ alert('Microphone permission is required.\n' + e); return; }

    inCall = true;
    joinBtn.disabled = true;
    leaveBtn && (leaveBtn.disabled = false);
    setStatus('Connecting…');
    startTimer();

    socket.emit('join', { roomId: room, peerId: myId, displayName: myName }, (ack)=>{
      if (!ack || ack.ok !== true){
        setStatus('Join failed'); log('join failed'); return;
      }
      setStatus('In Call');
      log(`Joined ${room} as ${myName}`);
      updatePeersUI();
    });
  }

  function leave(){
    try { socket.emit('leave', { roomId: room, peerId: myId }); } catch {}
    for (const pid of Object.keys(peers)) removePeer(pid, 'ended');
    if (localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream=null; }
    joinBtn.disabled = false;
    leaveBtn && (leaveBtn.disabled = true);
    inCall = false;
    stopTimer();
    setStatus('Idle');
    log('Call ended');
  }

  // socket events
  socket.on('connect', ()=> log('Signaling connected'));
  socket.on('disconnect', ()=> log('Signaling disconnected'));
  socket.on('connect_error', (e)=> log('Signaling error: ' + (e?.message||e)));

  socket.on('peers', async ({ peers: arr })=>{
    if (!Array.isArray(arr)) return;
    for (const p of arr){
      if (shouldIOffer(p.peerId)) await offerTo(p.peerId, p.displayName);
      else peers[p.peerId] = peers[p.peerId] || { pc:null, audioEl:null, displayName:p.displayName };
    }
    updatePeersUI();
  });

  socket.on('peer-joined', async ({ peer })=>{
    peers[peer.peerId] = peers[peer.peerId] || { pc:null, audioEl:null, displayName: peer.displayName };
    updatePeersUI();
    log(`${peer.displayName || 'Peer'} joined`);
    if (shouldIOffer(peer.peerId)) {
      try { await offerTo(peer.peerId, peer.displayName); } catch (e) { console.warn(e); }
    }
  });

  socket.on('peer-left', ({ peerId })=> removePeer(peerId, 'left'));

  socket.on('signal', async ({ from, data })=> { await handleSignal(from, data); });

  // wire UI
  joinBtn && joinBtn.addEventListener('click', join);
  leaveBtn && leaveBtn.addEventListener('click', leave);

  // Optional: auto-join when ?room= is present
  const qp = new URLSearchParams(location.search);
  const qr = qp.get('room');
  if (qr && roomInput) {
    roomInput.value = qr;
    // require a click for mic permission on some browsers; try immediate then fall back to gesture
    setTimeout(()=>{
      const attempt = () => { document.removeEventListener('click', attempt); document.removeEventListener('keydown', attempt); join(); };
      document.addEventListener('click', attempt, { once:true });
      document.addEventListener('keydown', attempt, { once:true });
      join();
    }, 100);
  }
})();
