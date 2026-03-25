"use client";

import { useState, useEffect } from "react";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";

const messages = [
    { sender: "user", text: "Hey! How much is the summer floral dress?", delay: 1000 },
    { sender: "bot", text: "Hi there! The Summer Floral Dress is $45. We have it in sizes S, M, and L. Would you like the link to order?", delay: 2000 },
    { sender: "user", text: "Yes please. Also do you ship to Canada?", delay: 4000 },
    { sender: "bot", text: "We do ship to Canada! Standard shipping takes 5-7 days. Here is the link: [Shop Now]. Since you asked about international shipping, I am bringing a human agent into the chat to handle any specific customs questions!", delay: 5500 },
];

export function InteractiveDemo() {
    const [visibleMessages, setVisibleMessages] = useState<typeof messages>([]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        let mounted = true;

        const runDemo = async () => {
            setVisibleMessages([]);
            for (let i = 0; i < messages.length; i++) {
                if (!mounted) break;
                const msg = messages[i]!;
                setIsTyping(msg.sender === "bot");
                const prevDelay = i === 0 ? 0 : messages[i - 1]!.delay;
                await new Promise(r => setTimeout(r, msg.delay - prevDelay));
                if (!mounted) break;
                setIsTyping(false);
                setVisibleMessages(prev => [...prev, msg]);
            }
        };

        runDemo();

        return () => { mounted = false; };
    }, []);

    return (
        <div className="max-w-md mx-auto mt-12 mb-8 text-left bg-background rounded-2xl shadow-xl shadow-violet-500/10 border overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 relative">
            <div className="bg-muted/50 p-4 border-b flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full">
                    <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm">EbizMate AI</h4>
                    <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                    </p>
                </div>
            </div>

            <div className="p-5 space-y-4 h-[320px] overflow-y-auto flex flex-col justify-start">
                {visibleMessages.map((msg, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.sender === "user" ? "bg-violet-600 text-white rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="p-3 bg-muted rounded-2xl rounded-tl-sm flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
