export interface CommandProposal {
    command: string
    severity: 'low' | 'high'
    reason: string
    timeout: number  // Timeout in seconds
}

export type LoopStatus = 'idle' | 'continue' | 'blocked' | 'done'

export interface AgentResponse {
    message: string
    proposal?: CommandProposal
    session_id?: string
    loop_status: LoopStatus
    iteration_count: number
    blocker_reason?: string
}

export interface ChatMessage {
    sender: 'user' | 'agent'
    text: string
    proposal?: CommandProposal
    isApprovalRequest?: boolean
    executionResult?: string
    iteration?: number
    loopStatus?: LoopStatus
    isExecuting?: boolean  // Command is currently running
    streamingOutput?: string  // Live output from command
    isLoading?: boolean  // Waiting for LLM response
}
