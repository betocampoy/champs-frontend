// champs-core/loader.templates.js
// Templates do Loader (o ideal é que cada template seja "self-contained")
// para não depender de um CSS externo estar carregado.

// ===== Wine =====
export const loaderWine = `
  <div class="wine-loader text-center">
    <svg width="64" height="64" viewBox="0 0 64 64" aria-label="Carregando..." role="img" class="wine-glass">
      <path d="M16 4h32c0 10-8 18-16 18S16 14 16 4z" fill="#800020"/>
      <path d="M32 22c-8 0-16-8-16-18h32c0 10-8 18-16 18z" fill="none" stroke="#3a3a3a" stroke-width="2"/>
      <path d="M32 22v22" stroke="#3a3a3a" stroke-width="3"/>
      <path d="M22 44h20" stroke="#3a3a3a" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <div class="small mt-2">Carregando...</div>
  </div>
`;

// ===== Wine Animated (com CSS embutido) =====
export const loaderWineAnimated = `
  <style>
    .champs-wine-animated{width:64px;height:64px;color:#800020}
    .champs-wine-svg{width:100%;height:100%}
    .champs-wine-fill{fill:currentColor;transform:translateY(40px);animation:champs-wine-fill-up 2s ease-in-out infinite alternate}
    @keyframes champs-wine-fill-up{from{transform:translateY(40px);height:0}to{transform:translateY(0);height:40px}}
  </style>
  <div class="champs-wine-animated" role="img" aria-label="Carregando">
    <svg viewBox="0 0 64 64" class="champs-wine-svg" width="64" height="64" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="champs-glass-clip" clipPathUnits="userSpaceOnUse">
          <path d="M16,6 h32 v22 c0,10 -8,18 -16,18 s-16,-8 -16,-18 z"></path>
        </clipPath>
      </defs>
      <g clip-path="url(#champs-glass-clip)">
        <rect class="champs-wine-fill" x="16" y="6" width="32" height="40"></rect>
      </g>
      <path d="M16,6 h32 v22 c0,10 -8,18 -16,18 s-16,-8 -16,-18 z"
            fill="none" stroke="currentColor" stroke-width="2"></path>
      <rect x="31" y="46" width="2" height="10" fill="currentColor" opacity=".6"></rect>
      <rect x="24" y="56" width="16" height="2" fill="currentColor" opacity=".6"></rect>
    </svg>
  </div>
`;

// ===== Minimal Dots (com CSS embutido) =====
export const loaderMinimal = `
  <style>
    .dots-loader{display:inline-flex;gap:6px;align-items:center;color:#111}
    .dots-loader .dot{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.7;animation:dots-bounce 1.2s infinite ease-in-out}
    .dots-loader .dot:nth-child(2){animation-delay:.15s}
    .dots-loader .dot:nth-child(3){animation-delay:.3s}
    @keyframes dots-bounce{0%,80%,100%{transform:scale(1);opacity:.6}40%{transform:scale(1.3);opacity:1}}
  </style>
  <div class="dots-loader" aria-label="Carregando..." role="status">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
  </div>
`;

// ===== Cornetas (com CSS embutido) =====
export const loaderCornetas = `
  <style>
    .champs-cornetas-min{width:80px;height:60px;color:#ff7a00}
    .cn-svg{width:100%;height:100%}
    .cn-waves path{animation:cn-wave 1.6s ease-out infinite}
    .cn-waves path:nth-child(2){animation-delay:.25s}
    .cn-waves path:nth-child(3){animation-delay:.5s}
    @keyframes cn-wave{0%{stroke-dashoffset:36;opacity:0}20%{opacity:.9}80%{opacity:.9}100%{stroke-dashoffset:0;opacity:0}}
  </style>
  <div class="champs-cornetas-min" role="img" aria-label="Carregando">
    <svg viewBox="0 0 120 60" class="cn-svg" width="120" height="60" aria-hidden="true">
      <path d="M12 34 h34 l20-10 v20 l-20-10 h-34 z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="76" cy="34" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
      <g class="cn-waves">
        <path d="M90 34 q10 -10 22 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="36" stroke-dashoffset="36"/>
        <path d="M90 34 q10  10 22 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="36" stroke-dashoffset="36"/>
        <path d="M92 34 q12   0 24 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="28" stroke-dashoffset="28"/>
      </g>
    </svg>
  </div>
`;

export const loaderCornetasMinimal = `
  <style>
    .champs-cornetas-ping{width:80px;height:60px;color:#ff7a00}
    .cn-svg{width:100%;height:100%}
    .cn-pulse{transform-origin:76px 34px;animation:cn-ping 1.4s ease-out infinite}
    @keyframes cn-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
  </style>
  <div class="champs-cornetas-ping" role="img" aria-label="Carregando">
    <svg viewBox="0 0 120 60" class="cn-svg" width="120" height="60" aria-hidden="true">
      <path d="M12 34 h34 l20-10 v20 l-20-10 h-34 z" fill="currentColor"/>
      <circle cx="76" cy="34" r="8" fill="currentColor" opacity=".25"/>
      <circle class="cn-pulse" cx="76" cy="34" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>
  </div>
`;

// ===== OrganizzeMe (com CSS embutido) =====
export const loaderOrganizzeMe = `
  <style>
    .champs-org-book{width:84px;height:84px;color:#0d6efd}
    .org-svg{width:100%;height:100%}
    .org-page{transform-origin:18px 20px;animation:org-slide 1.4s ease-in-out infinite}
    @keyframes org-slide{0%{transform:translateX(0) skewX(0);opacity:.55}50%{transform:translateX(84px) skewX(-10deg);opacity:.25}100%{transform:translateX(0) skewX(0);opacity:.55}}
  </style>
  <div class="champs-org-book" role="img" aria-label="Carregando">
    <svg viewBox="0 0 120 84" class="org-svg" width="120" height="84" aria-hidden="true">
      <rect x="6" y="8" width="108" height="68" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
      <rect x="18" y="20" width="84" height="44" fill="currentColor" opacity=".12"/>
      <rect x="18" y="22" width="84" height="44" fill="currentColor" opacity=".12"/>
      <rect class="org-page" x="18" y="20" width="84" height="44" fill="currentColor" opacity=".55"/>
      <g opacity=".6" stroke="currentColor" stroke-width="2">
        <circle cx="30" cy="16" r="2" fill="currentColor"/><circle cx="44" cy="16" r="2" fill="currentColor"/>
        <circle cx="58" cy="16" r="2" fill="currentColor"/><circle cx="72" cy="16" r="2" fill="currentColor"/>
        <circle cx="86" cy="16" r="2" fill="currentColor"/>
      </g>
    </svg>
  </div>
`;

export const loaderOrganizzeMeMinimal = `
  <style>
    .champs-org-min{width:84px;height:84px;color:#0d6efd}
    .org-svg{width:100%;height:100%}
    .org-sweep{animation:org-sweep 1.6s linear infinite}
    @keyframes org-sweep{0%{transform:translateX(0);opacity:.10}50%{transform:translateX(84px);opacity:.20}100%{transform:translateX(0);opacity:.10}}
  </style>
  <div class="champs-org-min" role="img" aria-label="Carregando">
    <svg viewBox="0 0 120 84" class="org-svg" width="120" height="84" aria-hidden="true">
      <rect x="10" y="12" width="100" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
      <g class="org-lines" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7">
        <line x1="24" x2="96" y1="30" y2="30"/>
        <line x1="24" x2="96" y1="42" y2="42"/>
        <line x1="24" x2="96" y1="54" y2="54"/>
      </g>
      <rect class="org-sweep" x="18" y="22" width="84" height="44" rx="4" fill="currentColor" opacity=".08"/>
    </svg>
  </div>
`;

export function getTruckLoaderTemplate(message = 'Aguarde um instante...') {
    const uid = `truck-${Math.random().toString(36).slice(2, 9)}`;
    const gradientBodyId = `${uid}-body`;
    const gradientCabinId = `${uid}-cabin`;
    const shadowId = `${uid}-shadow`;

    return `
    <style>
      .champs-truck-loader{
        display:inline-flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:10px;
        min-width:280px;
        color:#0c0c0c;
      }
      .champs-truck-loader__svg-wrap{
        width:260px;
        max-width:100%;
        line-height:0;
      }
      .champs-truck-loader__svg{
        display:block;
        width:100%;
        height:auto;
        overflow:visible;
      }
      .champs-truck-loader__text{
        font-size:.95rem;
        font-weight:600;
        line-height:1.25;
        color:#495057;
        text-align:center;
      }
      .champs-truck-loader__body{
        transform-origin:center;
        animation:champs-truck-float 1.1s ease-in-out infinite alternate;
      }
      .champs-truck-loader__cabin{
        transform-origin:225px 82px;
        animation:champs-truck-cabin-bounce .7s ease-in-out infinite alternate;
      }
      .champs-truck-loader__wheel{
        transform-box:fill-box;
        transform-origin:center;
        animation:champs-truck-wheel-spin .85s linear infinite;
      }
      .champs-truck-loader__road-marks{
        animation:champs-truck-road-move .9s linear infinite;
      }
      .champs-truck-loader__smoke{
        transform-origin:78px 78px;
        animation:champs-truck-smoke-drift 1.6s ease-out infinite;
      }

      @keyframes champs-truck-wheel-spin{
        from{transform:rotate(0deg)}
        to{transform:rotate(360deg)}
      }
      @keyframes champs-truck-road-move{
        from{transform:translateX(0)}
        to{transform:translateX(-45px)}
      }
      @keyframes champs-truck-float{
        from{transform:translateY(0)}
        to{transform:translateY(-2px)}
      }
      @keyframes champs-truck-cabin-bounce{
        from{transform:translateY(0)}
        to{transform:translateY(-1.5px)}
      }
      @keyframes champs-truck-smoke-drift{
        0%{opacity:0;transform:translate(0,0) scale(.9)}
        20%{opacity:1}
        100%{opacity:0;transform:translate(-18px,-12px) scale(1.15)}
      }
    </style>

    <div class="champs-truck-loader" role="status" aria-live="polite" aria-label="Carregando">
      <div class="champs-truck-loader__svg-wrap">
        <svg class="champs-truck-loader__svg" viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="${gradientBodyId}" x1="0" x2="1">
              <stop offset="0%" stop-color="#0d6efd"/>
              <stop offset="100%" stop-color="#0a58ca"/>
            </linearGradient>
            <linearGradient id="${gradientCabinId}" x1="0" x2="1">
              <stop offset="0%" stop-color="#4dabf7"/>
              <stop offset="100%" stop-color="#1c7ed6"/>
            </linearGradient>
            <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.18"/>
            </filter>
          </defs>

          <ellipse cx="160" cy="108" rx="88" ry="10" fill="rgba(0,0,0,.10)"/>

          <g>
            <rect x="35" y="95" width="250" height="8" rx="4" fill="#d0d7de"/>
            <g class="champs-truck-loader__road-marks">
              <rect x="50"  y="98" width="22" height="2.5" rx="1.25" fill="#ffffff"/>
              <rect x="95"  y="98" width="22" height="2.5" rx="1.25" fill="#ffffff"/>
              <rect x="140" y="98" width="22" height="2.5" rx="1.25" fill="#ffffff"/>
              <rect x="185" y="98" width="22" height="2.5" rx="1.25" fill="#ffffff"/>
              <rect x="230" y="98" width="22" height="2.5" rx="1.25" fill="#ffffff"/>
            </g>
          </g>

          <g class="champs-truck-loader__smoke">
            <circle cx="78" cy="78" r="4" fill="rgba(108,117,125,.45)"/>
            <circle cx="66" cy="74" r="6" fill="rgba(108,117,125,.28)"/>
            <circle cx="54" cy="70" r="8" fill="rgba(108,117,125,.16)"/>
          </g>

          <g class="champs-truck-loader__body" filter="url(#${shadowId})">
            <rect x="95" y="45" width="102" height="42" rx="8" fill="url(#${gradientBodyId})"/>
            <rect x="103" y="53" width="50" height="8" rx="4" fill="rgba(255,255,255,.22)"/>

            <g class="champs-truck-loader__cabin">
              <path d="M197 55 h34 c8 0 13 2 18 8 l12 14 v10 h-64 z" fill="url(#${gradientCabinId})"/>
              <path d="M225 60 h19 c5 0 8 1 11 5 l6 8 h-36 z" fill="rgba(255,255,255,.78)"/>
            </g>

            <rect x="250" y="82" width="15" height="5" rx="2.5" fill="#495057"/>
            <rect x="110" y="84" width="128" height="8" rx="4" fill="#343a40"/>

            <g class="champs-truck-loader__wheel">
              <circle cx="128" cy="95" r="15" fill="#212529"/>
              <circle cx="128" cy="95" r="8.5" fill="#adb5bd"/>
              <g>
                <rect x="127" y="84" width="2" height="22" rx="1" fill="#6c757d"/>
                <rect x="117" y="94" width="22" height="2" rx="1" fill="#6c757d"/>
              </g>
            </g>

            <g class="champs-truck-loader__wheel">
              <circle cx="229" cy="95" r="15" fill="#212529"/>
              <circle cx="229" cy="95" r="8.5" fill="#adb5bd"/>
              <g>
                <rect x="228" y="84" width="2" height="22" rx="1" fill="#6c757d"/>
                <rect x="218" y="94" width="22" height="2" rx="1" fill="#6c757d"/>
              </g>
            </g>

            <rect x="259" y="72" width="6" height="6" rx="2" fill="#ffd43b"/>
            <text x="116" y="72" font-size="11" font-family="Arial, sans-serif" font-weight="700" fill="rgba(255,255,255,.92)">
              Minha Encomenda
            </text>
          </g>
        </svg>
      </div>

      <div class="champs-truck-loader__text">${message}</div>
    </div>
  `;
}

export const loaderTruckMinimal = `
  <style>
    .champs-truck-min{
      width:120px;
      height:52px;
      color:#0c0c0c;
    }
    .champs-truck-min__svg{
      width:100%;
      height:100%;
      overflow:visible;
    }
    .champs-truck-min__body{
      animation:champs-truck-min-bob .9s ease-in-out infinite alternate;
      transform-origin:center;
    }
    .champs-truck-min__wheel{
      transform-box:fill-box;
      transform-origin:center;
      animation:champs-truck-min-wheel .8s linear infinite;
    }
    .champs-truck-min__road line{
      animation:champs-truck-min-road .9s linear infinite;
    }

    @keyframes champs-truck-min-wheel{
      from{transform:rotate(0deg)}
      to{transform:rotate(360deg)}
    }
    @keyframes champs-truck-min-bob{
      from{transform:translateY(0)}
      to{transform:translateY(-1.5px)}
    }
    @keyframes champs-truck-min-road{
      from{transform:translateX(0)}
      to{transform:translateX(-24px)}
    }
  </style>

  <div class="champs-truck-min" role="img" aria-label="Carregando">
    <svg viewBox="0 0 140 52" class="champs-truck-min__svg" width="140" height="52" aria-hidden="true" focusable="false">
      <g class="champs-truck-min__road" stroke="currentColor" stroke-width="2" opacity=".25" stroke-linecap="round">
        <line x1="20" x2="44" y1="44" y2="44"/>
        <line x1="58" x2="82" y1="44" y2="44"/>
        <line x1="96" x2="120" y1="44" y2="44"/>
      </g>

      <g class="champs-truck-min__body">
        <rect x="28" y="16" width="44" height="18" rx="4" fill="currentColor"/>
        <path d="M72 20 h18 c5 0 8 1 11 4 l7 8 v2 h-36 z" fill="currentColor" opacity=".85"/>
        <rect x="38" y="34" width="46" height="4" rx="2" fill="#343a40"/>

        <g class="champs-truck-min__wheel">
          <circle cx="46" cy="38" r="7" fill="#212529"/>
          <circle cx="46" cy="38" r="3.5" fill="#adb5bd"/>
          <rect x="45.5" y="31.5" width="1" height="13" rx=".5" fill="#6c757d"/>
          <rect x="39.5" y="37.5" width="13" height="1" rx=".5" fill="#6c757d"/>
        </g>

        <g class="champs-truck-min__wheel">
          <circle cx="88" cy="38" r="7" fill="#212529"/>
          <circle cx="88" cy="38" r="3.5" fill="#adb5bd"/>
          <rect x="87.5" y="31.5" width="1" height="13" rx=".5" fill="#6c757d"/>
          <rect x="81.5" y="37.5" width="13" height="1" rx=".5" fill="#6c757d"/>
        </g>
      </g>
    </svg>
  </div>
`;
