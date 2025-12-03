import { Terminal, ShieldAlert, Activity, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { CommandProposal } from '../types'

interface CommandProposalCardProps {
    proposal: CommandProposal
    isApprovalRequest?: boolean
    executionResult?: string
    isExecuting?: boolean
    streamingOutput?: string
    onApprove: () => void
    onReject: () => void
}

export function CommandProposalCard({
    proposal,
    isApprovalRequest,
    executionResult,
    isExecuting,
    streamingOutput,
    onApprove,
    onReject
}: CommandProposalCardProps) {
    return (
        <div className="w-full mt-1 overflow-hidden rounded-lg border border-gray-700/50 bg-background shadow-2xl">
            {/* Card Header */}
            <div className="px-4 py-2 bg-panel border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    <Terminal className="w-3 h-3" />
                    <span>COMMAND PROPOSAL</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Timeout indicator */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{proposal.timeout}s</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono ${proposal.severity === 'high'
                        ? 'bg-warning/10 text-warning border border-warning/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                        {proposal.severity === 'high' && <ShieldAlert className="w-3 h-3" />}
                        {proposal.severity}
                    </div>
                </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
                <div className="relative group">
                    <code className="block bg-black/30 p-3 rounded-md text-primary font-mono text-xs border border-gray-800 group-hover:border-gray-700 transition-colors">
                        <span className="text-gray-600 select-none">$ </span>
                        {proposal.command}
                    </code>
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 bg-primary/5 p-2 rounded border border-primary/10">
                    <div className="mt-0.5 text-primary"><Activity className="w-3 h-3" /></div>
                    <span className="font-mono">{proposal.reason}</span>
                </div>

                {/* Actions / Result / Live Terminal */}
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
                    ) : isExecuting ? (
                        /* Live Terminal - Command is running */
                        <div className="rounded-md overflow-hidden border border-primary/30 animate-in zoom-in-95 duration-300">
                            <div className="px-3 py-1.5 bg-black/40 border-b border-primary/30 text-[10px] font-mono text-gray-500 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Terminal className="w-3 h-3 text-primary" />
                                    EXECUTING
                                </span>
                                <div className="flex items-center gap-1 text-primary">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>RUNNING</span>
                                </div>
                            </div>
                            <pre className="p-3 bg-black/50 text-[11px] text-gray-300 font-mono overflow-x-auto max-h-64 custom-scrollbar whitespace-pre-wrap">
                                {streamingOutput || 'Waiting for output...'}
                                <span className="inline-block w-2 h-3 bg-primary/70 animate-pulse ml-0.5"></span>
                            </pre>
                        </div>
                    ) : (
                        executionResult && (
                            /* Final Result */
                            <div className="rounded-md overflow-hidden border border-gray-800 animate-in zoom-in-95 duration-300">
                                <div className="px-3 py-1.5 bg-black/40 border-b border-gray-800 text-[10px] font-mono text-gray-500 flex items-center justify-between">
                                    <span>TERMINAL OUTPUT</span>
                                    <span className={executionResult.startsWith('ERROR:') ? 'text-warning' : 'text-primary'}>
                                        {executionResult.startsWith('ERROR:') ? 'ERROR' : 'SUCCESS'}
                                    </span>
                                </div>
                                <pre className="p-3 bg-black/50 text-[11px] text-gray-300 font-mono overflow-x-auto max-h-64 custom-scrollbar whitespace-pre-wrap">
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
