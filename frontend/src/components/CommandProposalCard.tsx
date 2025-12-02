import { Terminal, ShieldAlert, Activity, CheckCircle2, XCircle } from 'lucide-react'
import { CommandProposal } from '../types'

interface CommandProposalCardProps {
    proposal: CommandProposal
    isApprovalRequest?: boolean
    executionResult?: string
    onApprove: () => void
    onReject: () => void
}

export function CommandProposalCard({
    proposal,
    isApprovalRequest,
    executionResult,
    onApprove,
    onReject
}: CommandProposalCardProps) {
    return (
        <div className="w-full mt-1 overflow-hidden rounded-xl border border-gray-700 bg-[#0f1319] shadow-2xl">
            {/* Card Header */}
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>COMMAND PROPOSAL</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${proposal.severity === 'high'
                        ? 'bg-warning/10 text-warning border border-warning/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                    {proposal.severity === 'high' && <ShieldAlert className="w-3 h-3" />}
                    {proposal.severity} SEVERITY
                </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
                <div className="relative group">
                    <code className="block bg-black/50 p-3 rounded-lg text-green-400 font-mono text-sm border border-gray-800 group-hover:border-gray-600 transition-colors">
                        <span className="text-gray-600 select-none">$ </span>
                        {proposal.command}
                    </code>
                </div>

                <div className="mt-3 flex items-start gap-2 text-sm text-gray-400 bg-blue-900/10 p-2 rounded border border-blue-900/20">
                    <div className="mt-0.5 text-blue-400"><Activity className="w-4 h-4" /></div>
                    <span className="italic">{proposal.reason}</span>
                </div>

                {/* Actions / Result */}
                <div className="mt-4">
                    {isApprovalRequest ? (
                        <div className="flex gap-3 animate-in fade-in">
                            <button
                                onClick={onApprove}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(22,163,74,0.2)] hover:shadow-[0_0_20px_rgba(22,163,74,0.4)]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve Execution
                            </button>
                            <button
                                onClick={onReject}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        </div>
                    ) : (
                        executionResult && (
                            <div className="rounded-lg overflow-hidden border border-gray-800 animate-in zoom-in-95 duration-300">
                                <div className="px-3 py-1.5 bg-gray-900 border-b border-gray-800 text-[10px] font-mono text-gray-500 flex items-center justify-between">
                                    <span>TERMINAL OUTPUT</span>
                                    <span className="text-green-500">SUCCESS</span>
                                </div>
                                <pre className="p-3 bg-black text-xs text-gray-300 font-mono overflow-x-auto max-h-48 custom-scrollbar">
                                    {executionResult}
                                </pre>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
