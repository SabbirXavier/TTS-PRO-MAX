export function getThemeClasses(theme: string, type: 'container' | 'accent' | 'text' = 'container') {
  switch (theme) {
    case 'neonMint':
      if (type === 'container') return 'backdrop-blur-md bg-black/95 border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] !rounded-none';
      if (type === 'accent') return 'bg-green-500 text-black font-black uppercase shadow-[0_0_20px_rgba(34,197,94,1)]';
      if (type === 'text') return 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]';
      break;
    case 'crimsonCyber':
      if (type === 'container') return 'bg-[#0a0000]/95 border-b-4 border-t-4 border-red-600 shadow-[0_10px_30px_rgba(220,38,38,0.3)] !rounded-none -skew-x-3';
      if (type === 'accent') return 'bg-red-600 text-white font-black uppercase skew-x-3 border-l-4 border-white';
      if (type === 'text') return 'text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)] tracking-widest';
      break;
    case 'minimal':
      if (type === 'container') return 'bg-white/5 backdrop-blur-md border border-white/20 !rounded-none';
      if (type === 'accent') return 'bg-white text-black font-black uppercase';
      if (type === 'text') return 'text-white tracking-widest';
      break;
    default:
      // default glass
      if (type === 'container') return 'backdrop-blur-3xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[2.5rem]';
      if (type === 'accent') return 'text-white font-black uppercase rounded-lg';
      if (type === 'text') return 'text-chrome';
      break;
  }
  return '';
}
