import React from 'react';

interface SeasonalIconProps {
  icon: string;
  className?: string;
}

export function SeasonalIcon({ icon, className = "w-5 h-5 text-[#f37021] shrink-0" }: SeasonalIconProps) {
  const normKey = (icon || '').toLowerCase();

  // Custom high-quality vector paths for produce items
  if (normKey.includes('fungo') || normKey === 'mushroom') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3C6.5 3 2 7.5 2 12c0 .6.4 1 1 1h18c.6 0 1-.4 1-1 0-4.5-4.5-9-10-9z" />
        <path d="M9 13v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
        <path d="M12 3v10" />
      </svg>
    );
  }

  if (normKey.includes('fico') || normKey === 'fig') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3" />
        <path d="M12 5c-3.5 0-7 3.5-7 8.5C5 18 8 21 12 21s7-3 7-7.5C19 8.5 15.5 5 12 5z" />
        <path d="M12 9v6" />
        <path d="M9.5 12.5h5" />
      </svg>
    );
  }

  if (normKey.includes('pera') || normKey.includes('prugna') || normKey === 'pear') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3" />
        <path d="M12 5c-2 0-3.5 1.5-3.5 3.5 0 1.5.5 2.5 0 4C7.5 14 6 16 6 18c0 2.2 2.7 4 6 4s6-1.8 6-4c0-2-1.5-4-2.5-5.5-.5-1.5 0-2.5 0-4C15.5 6.5 14 5 12 5z" />
      </svg>
    );
  }

  if (normKey.includes('zucca') || normKey === 'pumpkin') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3" />
        <ellipse cx="12" cy="14" rx="8" ry="6" />
        <ellipse cx="12" cy="14" rx="4.5" ry="6" />
        <line x1="12" y1="8" x2="12" y2="20" />
      </svg>
    );
  }

  if (normKey.includes('pomodoro') || normKey === 'tomato') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="14" r="7" />
        <path d="M12 7V3" />
        <path d="M9 7l3 2 3-2" />
        <path d="M10 5.5L12 7l2-1.5" />
      </svg>
    );
  }

  if (normKey.includes('melanzan') || normKey === 'eggplant') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3l-2 3" />
        <path d="M10 7c-1-1 0-3 3-3s4 2 3 3" />
        <path d="M11 7C7 9 5 13 5 16c0 3.3 2.7 6 6 6s7-2.7 7-6c0-3.5-3-6-7-9z" />
      </svg>
    );
  }

  if (normKey.includes('peperoncin') || normKey === 'chili') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3l-2 3" />
        <path d="M12 6c4 0 7 2.5 7 5 0 6-8 10-10 10-2 0-3-1-3-2 0-4 3-13 6-13z" />
      </svg>
    );
  }

  if (normKey.includes('peperon') || normKey === 'pepper') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3" />
        <path d="M7 8c-1.5 0-3 1.5-3 4 0 5 2.5 8 5 8s3-1.5 3-3 0.5 3 3 3 5-3 5-8c0-2.5-1.5-4-3-4-1 0-2 1-2 1s-1-1-2-1z" />
      </svg>
    );
  }

  if (normKey.includes('carciof') || normKey === 'artichoke') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v2" />
        <path d="M12 4L9 8h6l-3-4z" />
        <path d="M7 9l-3 4c0 3 2 6 5 7l3-3-5-8z" />
        <path d="M17 9l3 4c0 3-2 6-5 7l-3-3 5-8z" />
        <path d="M9 13l3 4 3-4-3-3-3 3z" />
      </svg>
    );
  }

  if (normKey.includes('broccol') || normKey === 'broccoli') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6" />
        <path d="M6 11c-1.5 0-2.5-1-2.5-2.5S5 6 6.5 6C7 4.5 8.5 3.5 10 3.5c1.2 0 2.3.6 2.8 1.5.5-.9 1.6-1.5 2.8-1.5 1.5 0 3 1 3.4 2.5 1.5 0 2.5 1 2.5 2.5S20.5 11 19 11c0 2-1.5 3.5-3.5 3.5H8.5C6.5 14.5 6 13 6 11z" />
      </svg>
    );
  }

  if (normKey.includes('uva') || normKey === 'grape') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3" />
        <circle cx="12" cy="7" r="2" />
        <circle cx="9" cy="10" r="2" />
        <circle cx="15" cy="10" r="2" />
        <circle cx="12" cy="13" r="2" />
        <circle cx="9" cy="16" r="2" />
        <circle cx="15" cy="16" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    );
  }

  if (normKey.includes('olio') || normKey === 'oliveoil') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2h4v3h-4z" />
        <path d="M10 5l-2 3v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-2-3h-8z" />
        <path d="M12 12v4" />
        <circle cx="12" cy="14" r="1" />
      </svg>
    );
  }

  if (normKey.includes('castagn') || normKey.includes('fruttasecca') || normKey === 'nut') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c4 0 8 4 8 9 0 5-3.5 8-8 8s-8-3-8-8c0-5 4-9 8-9z" />
        <path d="M6 15c2 1.5 4 2 6 2s4-.5 6-2" />
      </svg>
    );
  }

  if (normKey.includes('fragol') || normKey === 'strawberry') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2" />
        <path d="M8 4c2 1 6 1 8 0" />
        <path d="M12 5c-4.5 0-7 3.5-7 8 0 5 4 8 7 9 3-1 7-4 7-9 0-4.5-2.5-8-7-8z" />
        <circle cx="10" cy="10" r="0.5" fill="currentColor" />
        <circle cx="14" cy="10" r="0.5" fill="currentColor" />
        <circle cx="12" cy="14" r="0.5" fill="currentColor" />
      </svg>
    );
  }

  if (normKey.includes('cilieg') || normKey === 'cherry') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="17" r="4" />
        <circle cx="17" cy="17" r="4" />
        <path d="M7 13C9 8 13 4 17 3" />
        <path d="M17 13C16 9 14 6 12 3" />
        <path d="M12 3h5" />
      </svg>
    );
  }

  if (normKey.includes('limon') || normKey.includes('aranci') || normKey.includes('mandarin') || normKey === 'citrus') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 2v3" />
        <path d="M9 5c2-1 4-1 6 0" />
      </svg>
    );
  }

  if (normKey.includes('anguri') || normKey === 'watermelon') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 11c0 6.6 5.4 11 12 11 6.6 0 8-3.5 8-3.5L2 11z" />
        <path d="M2 11h20" />
        <circle cx="8" cy="15" r="0.5" fill="currentColor" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        <circle cx="16" cy="15" r="0.5" fill="currentColor" />
      </svg>
    );
  }

  if (normKey.includes('melon') || normKey === 'melon') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="13" rx="8" ry="7" />
        <path d="M12 2v4" />
        <path d="M12 6c-3 2-3 10 0 14" />
        <path d="M12 6c3 2 3 10 0 14" />
      </svg>
    );
  }

  if (normKey.includes('asparag') || normKey === 'asparagus') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 22V7l2-4 2 4v15" />
        <path d="M14 22V9l2-3 2 3v13" />
        <path d="M8 12l2-1.5" />
        <path d="M12 12l-2-1.5" />
        <path d="M14 14l2-1.5" />
      </svg>
    );
  }

  if (normKey.includes('pisell') || normKey.includes('fave') || normKey.includes('fagiolin') || normKey === 'peas') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7c8-3 16 0 18 10-5 5-15 4-18-10z" />
        <circle cx="8" cy="11" r="1.5" />
        <circle cx="13" cy="12" r="1.5" />
        <circle cx="17" cy="14" r="1.5" />
      </svg>
    );
  }

  if (normKey.includes('zucchin') || normKey.includes('cetriol') || normKey === 'zucchini') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17C2 13 4 8 8 6l10 10c-2 4-7 6-11 4z" />
        <path d="M18 16l4-2-2-3 3-1-4-2" />
      </svg>
    );
  }

  if (normKey.includes('fioredizucca') || normKey === 'flower') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c2 4 5 5 5 9 0 3.3-2.7 6-5 6s-5-2.7-5-6c0-4 3-5 5-9z" />
        <path d="M12 17v5" />
      </svg>
    );
  }

  if (normKey.includes('lattug') || normKey.includes('puntarell') || normKey.includes('radicchi') || normKey.includes('spinac') || normKey.includes('cavolo') || normKey.includes('agrett') || normKey === 'salad') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A9 9 0 0 0 20 11 9 9 0 0 0 11 2s-4 4-4 9 4 9 4 9z" />
        <path d="M11 2a9 9 0 0 0-9 9 9 9 0 0 0 9 9" />
      </svg>
    );
  }

  if (normKey.includes('finocchi') || normKey === 'fennel') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 10c-3 0-5 3-5 6s2 5 5 5 5-2 5-5-2-6-5-6z" />
        <path d="M9 10L6 3" />
        <path d="M15 10l3-7" />
        <path d="M12 10V2" />
      </svg>
    );
  }

  if (normKey.includes('melogran') || normKey.includes('caco') || normKey.includes('nespola') || normKey.includes('albicocc') || normKey.includes('mela') || normKey === 'apple') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="14" r="7" />
        <path d="M12 2v5" />
        <path d="M12 4c2-1 4-1 5 0" />
      </svg>
    );
  }

  // Default leaf icon for any general herbs/greens
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A9 9 0 0 0 20 11 9 9 0 0 0 11 2s-4 4-4 9 4 9 4 9z" />
      <path d="M11 2a9 9 0 0 0-9 9 9 9 0 0 0 9 9" />
    </svg>
  );
}
