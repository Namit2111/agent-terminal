export interface CommandProposal {
    command: string
    severity: 'low' | 'high'
    reason: string
}

export interface AgentResponse {
    message: string
    proposal?: CommandProposal
}

export interface ChatMessage {
    sender: 'user' | 'agent'
    text: string
    proposal?: CommandProposal
    isApprovalRequest?: boolean
    executionResult?: string
}
