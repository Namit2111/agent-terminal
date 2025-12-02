import { User, Bot } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../types'
import { CommandProposalCard } from './CommandProposalCard'

interface ChatBubbleProps {
    message: ChatMessageType
    onApprove: () => void
    onReject: () => void
}

export function ChatBubble({ message, onApprove, onReject }: ChatBubbleProps) {
    const isUser = message.sender === 'user'

    return (
        <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${isUser
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(61,155,255,0.3)]'
                : 'bg-panel border border-gray-700/50 text-primary'
                }`}>
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-2xl flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-xl shadow-sm leading-relaxed text-sm ${isUser
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-panel border border-gray-700/50 text-text rounded-tl-none'
                    }`}>
                    {message.text}
                </div>

                {/* Command Proposal Card */}
                {message.proposal && (
                    <CommandProposalCard
                        proposal={message.proposal}
                        isApprovalRequest={message.isApprovalRequest}
                        executionResult={message.executionResult}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                )}
            </div>
        </div>
    )
}
