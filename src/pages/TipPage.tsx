import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  CreditCard, Send, IndianRupee, MessageCircle, 
  CheckCircle2, ShieldCheck, Globe, Zap, 
  AlertCircle, Link as LinkIcon, X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { streamerApi, donationApi, adminApi } from '../lib/api';
import { auth, googleProvider } from '../lib/firebase';
import { Streamer } from '../types';
import { cn } from '../lib/utils';

import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';

export default function TipPage() {
  const { username } = useParams();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [tipperUser, setTipperUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [platformName, setPlatformName] = useState('Boost');
  const [error, setError] = useState<string | null>(null);

  const AVAILABLE_GIFS = [
    { id: 'sorry', name: 'sorry', url: 'https://media.tenor.com/7bC9c6wW9nIAAAAj/sorry-im-sorry.gif' },
    { id: 'congrats', name: 'congratulations', url: 'https://media.tenor.com/W2l4D93h22EAAAAj/congratulations-congrats.gif' },
    { id: 'sleepy', name: 'sleepy', url: 'https://media.tenor.com/2U54-SAnvFMAAAAj/sleepy-tired.gif' },
    { id: 'hello', name: 'hello', url: 'https://media.tenor.com/_q1Q8jV56ZcAAAAj/tkthao219-bubududu.gif' },
    { id: 'hugs', name: 'hugs', url: 'https://media.tenor.com/8aJq5g4B5uMAAAAj/tkthao219-peach.gif' },
    { id: 'ok', name: 'ok', url: 'https://media.tenor.com/uVzYvAHEt84AAAAj/ok.gif' },
    { id: 'please', name: 'please', url: 'https://media.tenor.com/OqXm7sZq_OQAAAAj/please.gif' },
    { id: 'thank_you', name: 'thank you', url: 'https://media.tenor.com/xO4bHk0m-2kAAAAj/penguin-thank-you.gif' }
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
       setTipperUser(u);
       if (u && !donorName) setDonorName(u.displayName || '');
    });
    return () => unsub();
  }, [donorName]);

  const handleGoogleLogin = async () => {
     try {
       await signInWithPopup(auth, googleProvider);
       toast.success("Signed in with Google!");
     } catch (e) {
       toast.error("Google sign in failed");
     }
  };

  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({
    'INR': 83,
    'USD': 1,
    'EUR': 0.92,
    'GBP': 0.79
  });

  useEffect(() => {
    adminApi.getSettings().then(s => {
      if (s?.platformName) setPlatformName(s.platformName);
    }).catch(console.error);

    fetch('/api/public/exchange-rates')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setCurrencyRates(data.rates);
        }
      })
      .catch(console.error);
  }, []);

  const currencyMap: Record<string, string> = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  };

  useEffect(() => {
    async function fetchStreamer() {
      if (!username) return;
      setLoading(true);
      setError(null);
      
      try {
        const data = await streamerApi.getByUsername(username);
        setStreamer(data);
        
        if (data.preferredCurrency && currencyMap[data.preferredCurrency]) {
          setCurrency(currencyMap[data.preferredCurrency]);
        }

        const activeGateways = (data.gateways || []).filter((g: any) => g.config.enabled || (g.config.connected && g.config.enabled === undefined));
        if (activeGateways.length > 0) {
          setSelectedGateway(activeGateways[0].type);
        }
        
        if (activeGateways.some((g: any) => g.type === 'razorpay')) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
        }
      } catch (err: any) {
        console.error("[TipPage] Error:", err);
        if (err.response?.status === 404) {
          setStreamer(null);
        } else {
          setError(`Service Error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStreamer();
  }, [username]);

  const symbolToCode: Record<string, string> = {
    '₹': 'INR',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP'
  };

  const streamerBaseCurrency = streamer?.preferredCurrency || 'INR';
  const streamerBaseSymbol = currencyMap[streamerBaseCurrency] || '₹';
  const currentCode = symbolToCode[currency] || 'INR';
  
  const getConvertedAmount = () => {
    if (!amount || currentCode === streamerBaseCurrency) return null;
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal)) return null;
    
    // Rates are relative to base USD. e.g. USD=1, INR=83, EUR=0.92, GBP=0.79
    // Convert input amount to USD base
    const baseValue = amountVal / (currencyRates[currentCode] || 1);
    // Convert USD base to streamer's currency
    const finalValue = baseValue * (currencyRates[streamerBaseCurrency] || 1);
    
    return Math.round(finalValue * 100) / 100;
  };

  const convertedAmount = getConvertedAmount();

  const handleTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !streamer || !selectedGateway) return;

    setStatus('processing');
    
    // Always process payments using the streamer's base currency and converted amount
    const finalAmountToSend = convertedAmount !== null ? convertedAmount : parseFloat(amount);
    const finalCurrencyCode = symbolToCode[streamerBaseSymbol] || 'INR';
    const finalCurrencySymbol = streamerBaseSymbol;

    if (selectedGateway === 'razorpay') {
      try {
        const data = await donationApi.createOrder({
          streamerId: (streamer.firebaseUid || streamer.id),
          amount: finalAmountToSend,
          currency: finalCurrencyCode
        });

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: streamer.displayName,
          description: `Tip for ${streamer.displayName}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            try {
              await donationApi.recordSuccess({
                streamerId: (streamer.firebaseUid || streamer.id),
                donorName: donorName || 'Anonymous',
                donorImage: tipperUser?.photoURL || undefined,
                amount: finalAmountToSend,
                currency: finalCurrencySymbol,
                originalAmount: parseFloat(amount),
                originalCurrency: symbolToCode[currency] || 'INR',
                message: message,
                gifUrl: selectedGif || undefined,
                paymentId: response.razorpay_payment_id,
                orderId: data.orderId,
                status: 'verified',
                gateway: 'razorpay'
              });
              setStatus('success');
            } catch (err) {
              console.error(err);
              setStatus('idle');
            }
          },
          prefill: {
            name: donorName,
          },
          theme: {
            color: streamer.accentColor || '#ea580c',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setStatus('idle');
      } catch (err: any) {
        console.error(err);
        toast.error(`Payment Initialization Failed: ${err.message}`);
        setStatus('idle');
      }
      return;
    }

    // Manual/Other Gateways
    setTimeout(async () => {
      try {
        await donationApi.recordSuccess({
          streamerId: streamer.firebaseUid || streamer.id,
          donorName: donorName || 'Anonymous',
          donorImage: tipperUser?.photoURL || undefined,
          amount: finalAmountToSend,
          currency: finalCurrencySymbol,
          originalAmount: parseFloat(amount),
          originalCurrency: symbolToCode[currency] || 'INR',
          message: message,
          gifUrl: selectedGif || undefined,
          status: selectedGateway === 'upi_direct' ? 'pending' : 'verified',
          gateway: selectedGateway
        });
        setStatus('success');
      } catch (err) {
        console.error(err);
        setStatus('idle');
      }
    }, 1500);
  };

  if (error) return <div className="pt-40 px-4 text-center text-red-500 font-bold max-w-md mx-auto bg-red-500/10 p-6 rounded-2xl border border-red-500/20">{error}</div>;

  if (loading) return (
    <div className="pt-40 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
      <span className="text-neutral-500 font-medium italic">Synchronizing profile...</span>
    </div>
  );

  if (!streamer) return (
    <div className="pt-40 text-center flex flex-col items-center gap-6">
      <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center text-neutral-600 border border-white/5">
         <AlertCircle size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 uppercase italic tracking-tighter pr-2">Profile Not Found</h1>
        <p className="text-neutral-500 max-w-xs mx-auto">No creator discovered with the handle <span className="text-orange-500 font-bold italic">@{username}</span>. Are you sure it's claimed?</p>
      </div>
      <Link to="/dashboard" className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/5 transition-colors">Return to Console</Link>
    </div>
  );

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          style={{ borderColor: streamer.accentColor ? `${streamer.accentColor}33` : undefined }}
        >
          {/* Header */}
          <div className="h-48 bg-neutral-800 relative overflow-hidden">
             {streamer.coverImage ? (
                <img src={streamer.coverImage} alt="Cover" className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full" style={{ background: streamer.accentColor || '#ea580c' }} />
             )}
             <div className="absolute -bottom-10 left-8 w-24 h-24 rounded-2xl bg-neutral-900 border-4 border-neutral-900 overflow-hidden shadow-2xl z-10">
                <img 
                  src={streamer.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamer.username}`} 
                  alt={streamer.displayName}
                  className="w-full h-full object-cover"
                />
             </div>
          </div>
          
          <div className="pt-14 px-8 pb-8">
            <h1 className="text-2xl font-black tracking-tight uppercase italic">{streamer.displayName}</h1>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">@{streamer.username}</span>
              <span className="text-[10px] uppercase font-black tracking-tighter italic bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md border border-orange-500/20">{streamer.verifiedCreatorTag || 'Verified Creator'}</span>
              <span className="text-[10px] uppercase font-black tracking-tighter italic bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md border border-blue-500/20">{streamer.tipsEnabledTag || 'Tips Enabled'}</span>
            </div>
            <p className="text-neutral-400 text-sm mb-8 leading-relaxed italic border-l-2 border-white/5 pl-4">
              "{streamer.bio || "Supporting the stream one tip at a time! 🚀"}"
            </p>

            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-lg">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">Contribution Sent!</h2>
                  <p className="text-neutral-400 mb-8 max-w-sm mx-auto text-sm italic">Thank you for supporting {streamer.displayName}. Your message will appear on stream instantly.</p>
                  <button 
                    onClick={() => { setStatus('idle'); setAmount(''); setMessage(''); }}
                    className="font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                  >
                    Send another contribution
                  </button>
                </motion.div>
              ) : (
                <form key="form" onSubmit={handleTip} className="space-y-8">
                  <div className="grid grid-cols-4 gap-2">
                    {['₹', '$', '€', '£'].map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={cn(
                          "py-3 rounded-xl border font-black transition-all text-sm uppercase tracking-widest",
                          currency === c ? "text-white" : "bg-neutral-950 border-white/5 text-neutral-500 hover:bg-neutral-900"
                        )}
                        style={currency === c ? { background: streamer.accentColor || '#ea580c', borderColor: streamer.accentColor || '#ea580c' } : {}}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-2">
                      {(streamer.predefinedAmounts || [50, 100, 500]).map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset.toString())}
                          className={cn(
                            "flex-1 py-4 rounded-2xl border font-black transition-all text-lg italic tracking-tighter",
                            amount === preset.toString() ? "text-white" : "bg-neutral-950 border-white/5 text-neutral-500 hover:bg-neutral-900"
                          )}
                          style={amount === preset.toString() ? { background: streamer.accentColor || '#ea580c', borderColor: streamer.accentColor || '#ea580c' } : {}}
                        >
                          {currency}{preset}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Custom Amount</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">{currency}</div>
                        <input 
                          type="number"
                          required
                        min="1"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-neutral-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:border-orange-500 outline-none transition-colors text-xl font-bold"
                        style={{'--tw-ring-color': streamer.accentColor} as any}
                      />
                    </div>
                    {convertedAmount && (
                      <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest px-2">
                        ≈ {streamerBaseSymbol} {convertedAmount} {streamerBaseCurrency}
                      </p>
                    )}
                  </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Select Payment Method</label>
                    <div className="grid grid-cols-1 gap-3">
                      {streamer.gateways?.filter(g => g.config.enabled || (g.config.connected && g.config.enabled === undefined)).length > 0 ? (
                        streamer.gateways.filter(g => g.config.enabled || (g.config.connected && g.config.enabled === undefined)).map(g => (
                          <button
                            key={g.type}
                            type="button"
                            onClick={() => setSelectedGateway(g.type)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all",
                              selectedGateway === g.type ? "bg-orange-600/10" : "bg-neutral-950 border-white/5 shadow-inner"
                            )}
                            style={selectedGateway === g.type ? { borderColor: streamer.accentColor || '#ea580c' } : {}}
                          >
                             <div className="flex items-center gap-3">
                               {g.type === 'upi_direct' && <img src="https://www.vectorlogo.zone/logos/upi/upi-icon.svg" className="w-6" alt="" />}
                               {g.type === 'stripe' && <Globe size={18} className="text-blue-500" />}
                               {g.type === 'razorpay' && <CreditCard size={18} className="text-indigo-500" />}
                               <span className="font-bold text-sm capitalize">{g.type.replace('_', ' ')}</span>
                             </div>
                             {selectedGateway === g.type && <div className="w-2.5 h-2.5 rounded-full" style={{ background: streamer.accentColor || '#ea580c' }} />}
                          </button>
                        ))
                      ) : (
                        <div className="p-10 rounded-2xl bg-neutral-950 border border-white/5 text-center text-xs text-neutral-500 italic border-dashed border-2">
                          No payment methods configured by streamer.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Your Name</label>
                       {!tipperUser ? (
                          <button 
                            type="button"
                            onClick={handleGoogleLogin}
                            className="text-[10px] flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/5 transition-all text-neutral-400 font-bold"
                          >
                             <img src="https://www.google.com/favicon.ico" className="w-3 h-3 grayscale opacity-50" alt="" />
                             Sign in for Avatar
                          </button>
                       ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                             <img src={tipperUser.photoURL || ''} className="w-4 h-4 rounded-full" alt="" referrerPolicy="no-referrer" />
                             <span className="text-[10px] text-green-500 font-bold">{tipperUser.displayName}</span>
                             <button type="button" onClick={() => signOut(auth)} className="text-neutral-500 hover:text-white"><X size={10} /></button>
                          </div>
                       )}
                    </div>
                    <input 
                      type="text"
                      placeholder="Display Name"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/5 rounded-2xl py-4 px-4 focus:border-orange-500 outline-none transition-colors font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Message</label>
                    <textarea 
                      placeholder="Your support message..."
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/5 rounded-2xl py-4 px-4 focus:border-orange-500 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">GIF (optional)</label>
                    {selectedGif ? (
                       <div className="relative inline-block mt-2">
                         <img src={selectedGif} alt="Selected GIF" className="h-24 rounded-lg object-cover border border-white/10" />
                         <button 
                           type="button" 
                           onClick={() => setSelectedGif(null)}
                           className="absolute -top-2 -right-2 bg-neutral-800 text-white rounded-full p-1"
                         >
                           <X size={12} />
                         </button>
                       </div>
                    ) : (
                       <button 
                         type="button" 
                         onClick={() => setIsGifModalOpen(true)}
                         className="flex items-center gap-2 bg-neutral-900 border border-white/5 hover:border-white/20 transition-all rounded-xl px-4 py-2 text-sm font-bold text-white mt-1"
                       >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                         Add GIF
                       </button>
                    )}
                  </div>

                  <button 
                    disabled={status === 'processing' || (streamer.gateways?.length || 0) === 0}
                    className={cn(
                      "w-full text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                      (status === 'processing' || (streamer.gateways?.length || 0) === 0) ? "opacity-50 cursor-not-allowed bg-neutral-700" : "hover:scale-[1.02] shadow-xl"
                    )}
                    style={!(status === 'processing' || (streamer.gateways?.length || 0) === 0) ? { background: streamer.accentColor || '#ea580c' } : {}}
                  >
                    {status === 'processing' ? "Processing Tip..." : <>Support Streamer <Send size={18} /></>}
                  </button>
                </form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Info */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-500 font-medium">
          <ShieldCheck size={14} />
          <span>Secured by {platformName}. 100% direct to creator.</span>
        </div>
        
        {/* GIF Modal */}
        <AnimatePresence>
          {isGifModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsGifModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                   <h3 className="text-sm font-bold">Select a GIF</h3>
                   <button onClick={() => setIsGifModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
                </div>
                
                {/* Scrollable grid */}
                <div className="p-4 grid grid-cols-2 gap-2 overflow-y-auto max-h-[50vh]">
                  {AVAILABLE_GIFS.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => { setSelectedGif(gif.url); setIsGifModalOpen(false); }}
                      className="relative rounded-lg overflow-hidden group border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02]"
                    >
                      <img src={gif.url} alt={gif.name} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-all flex items-center justify-center">
                         <span className="text-white font-black uppercase text-[10px] tracking-widest drop-shadow-md">{gif.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
