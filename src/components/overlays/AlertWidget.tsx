import React from 'react';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { InteractableElement } from './InteractableElement';
import { getThemeClasses } from '../../lib/themeUtils';

interface AlertWidgetProps {
    config: any;
    donation: any;
    isEditMode: boolean;
    onUpdate: (id: string, data: any) => void;
    className?: string;
    style?: React.CSSProperties;
    widthStr?: string;
    heightStr?: string;
    paddingStr?: string;
    boxBg?: any;
}

export function AlertWidget({ config, donation, isEditMode, onUpdate, className, style, widthStr, heightStr, paddingStr, boxBg }: AlertWidgetProps) {
    const containerClasses = getThemeClasses(config.theme || 'default', 'container');
    const textClasses = getThemeClasses(config.theme || 'default', 'text');
    const accentClasses = getThemeClasses(config.theme || 'default', 'accent');
    
    return (
        <InteractableElement
            id="container"
            config={config}
            isEditMode={isEditMode}
            onUpdate={onUpdate}
            defaultWidth={600}
            defaultHeight={300}
            className={`relative text-center flex flex-col items-center justify-center ${containerClasses} ${className || ''}`}
            style={{ 
                ...boxBg,
                width: widthStr,
                height: heightStr,
                padding: paddingStr,
                ...style 
            }}
        >
            <div className={`w-20 h-20 rounded-[2rem] mb-6 flex flex-shrink-0 items-center justify-center mx-auto overflow-hidden ${!donation?.gifUrl ? accentClasses : 'shadow-[0_0_40px_rgba(0,0,0,0.5)]'}`}
                style={!donation?.gifUrl ? { 
                    background: config.theme && config.theme !== 'default' ? undefined : `linear-gradient(135deg, ${config.primaryColor}, transparent)`, 
                    '--primary-glow': config.primaryColor 
                } as any : {}}
            >
                {donation?.gifUrl ? (
                   <img src={donation.gifUrl} className="w-full h-full object-cover" alt="GIF" />
                ) : (
                   <Volume2 size={40} className={config.theme && config.theme !== 'default' ? 'text-current' : 'text-white'} />
                )}
            </div>

            <div className="text-center w-full">
                <h2 className={`${textClasses} font-black italic uppercase tracking-tighter text-2xl mb-2`}>New Donation!</h2>
                <div className="flex flex-col">
                    <span className="font-black text-4xl text-white tracking-tighter uppercase italic break-words">
                       {donation.donorName} SENT 
                        <span style={config.theme !== 'default' ? undefined : { color: config.primaryColor }} className={config.theme !== 'default' ? textClasses : ''}> {donation.originalCurrency || donation.currency || '₹'}{donation.originalAmount || donation.amount}</span>
                    </span>
                </div>
            </div>

            <div className="w-full text-center mt-4">
                <div className="h-px w-full bg-white/10 mb-4" />
                <p className="text-zinc-400 font-bold italic text-sm leading-relaxed max-w-[80%] mx-auto">
                    "{donation.message}"
                </p>
            </div>
        </InteractableElement>
    );
}
