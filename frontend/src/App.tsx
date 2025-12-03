import { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  Cpu,
  Wifi,
  Activity,
  Send,
  Loader2,
  RotateCw
} from 'lucide-react'
import './App.css'
import { ChatMessage, AgentResponse, LoopStatus } from './types'
import { ChatBubble } from './components/ChatBubble'

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loopStatus, setLoopStatus] = useState<LoopStatus>('idle')
  const [iterationCount, setIterationCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const executeCommand = async (command: string) => {
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('execute-command', command)
      return { output: result.output, error: result.error || null }
    } catch (error) {
      return { output: '', error: `Error: ${error}` }
    }
  }

  const sendIterationToBackend = async (session: string, command: string, output: string, error?: string) => {
    if (!session) {
      console.error('No session ID available')
      return null
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session,
          command,
          output,
          error
        })
      })
      const data: AgentResponse = await res.json()
      return data
    } catch (error) {
      console.error('Iteration error:', error)
      return null
    }
  }

  const handleAutonomousLoop = async (initialResponse: AgentResponse, session: string) => {
    let currentResponse = initialResponse

    while (currentResponse.loop_status === 'continue' && currentResponse.proposal) {
      // Update iteration count
      setIterationCount(currentResponse.iteration_count)
      setLoopStatus('continue')

      // Add agent message
      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: currentResponse.message,
        proposal: currentResponse.proposal,
        iteration: currentResponse.iteration_count,
        loopStatus: currentResponse.loop_status,
        isApprovalRequest: currentResponse.proposal.severity === 'high'
      }

      setMessages(prev => [...prev, agentMsg])

      // If high severity, wait for user approval
      if (currentResponse.proposal.severity === 'high') {
        setLoading(false)
        setLoopStatus('blocked')
        return // Stop autonomous loop, wait for user approval
      }

      // Execute command for low severity
      const result = await executeCommand(currentResponse.proposal.command)

      // Update message with execution result
      setMessages(prev => {
        const newMsgs = [...prev]
        newMsgs[newMsgs.length - 1] = {
          ...newMsgs[newMsgs.length - 1],
          executionResult: result.error ? `ERROR: ${result.error}\n${result.output}` : result.output
        }
        return newMsgs
      })

      // Wait a bit for UI to update
      await new Promise(resolve => setTimeout(resolve, 500))

      // Send results back to backend for next iteration (include error if present)
      const nextResponse = await sendIterationToBackend(
        session,
        currentResponse.proposal.command,
        result.output,
        result.error || undefined
      )

      if (!nextResponse) {
        setLoading(false)
        setLoopStatus('blocked')
        setMessages(prev => [...prev, { sender: 'agent', text: 'Error communicating with backend.', loopStatus: 'blocked' }])
        return
      }

      currentResponse = nextResponse
    }

    // Final message if loop ended
    if (currentResponse.message) {
      const finalMsg: ChatMessage = {
        sender: 'agent',
        text: currentResponse.message,
        proposal: currentResponse.proposal,
        iteration: currentResponse.iteration_count,
        loopStatus: currentResponse.loop_status,
        isApprovalRequest: currentResponse.proposal?.severity === 'high'
      }
      setMessages(prev => [...prev, finalMsg])
    }

    setLoopStatus(currentResponse.loop_status)
    setIterationCount(currentResponse.iteration_count)
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg: ChatMessage = { sender: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setLoopStatus('continue')

    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          session_id: sessionId
        })
      })
      const data: AgentResponse = await res.json()

      // Store session ID
      if (data.session_id) {
        setSessionId(data.session_id)
      }

      // Start autonomous loop (pass session_id from response)
      await handleAutonomousLoop(data, data.session_id || '')

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'agent', text: 'Error connecting to backend.', loopStatus: 'blocked' }])
      setLoading(false)
      setLoopStatus('blocked')
    }
  }

  const handleApprove = async (index: number) => {
    const msg = messages[index]
    if (!msg.proposal) return

    setLoading(true)
    const result = await executeCommand(msg.proposal.command)

    // Update message with execution result
    setMessages(prev => {
      const newMsgs = [...prev]
      newMsgs[index] = {
        ...msg,
        isApprovalRequest: false,
        executionResult: result.error ? `ERROR: ${result.error}\n${result.output}` : result.output
      }
      return newMsgs
    })

    // Continue autonomous loop after approval
    try {
      const nextResponse = await sendIterationToBackend(
        sessionId || '',
        msg.proposal.command,
        result.output,
        result.error || undefined
      )

      if (nextResponse) {
        await handleAutonomousLoop(nextResponse, sessionId || '')
      } else {
        setLoading(false)
        setLoopStatus('blocked')
      }
    } catch (error) {
      setLoading(false)
      setLoopStatus('blocked')
    }
  }

  const handleReject = (index: number) => {
    setMessages(prev => {
      const newMsgs = [...prev]
      newMsgs[index] = { ...newMsgs[index], isApprovalRequest: false }
      return newMsgs
    })
    setLoopStatus('blocked')
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="px-6 py-4 bg-panel border-b border-gray-800/50 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-sm border border-primary/20 shadow-[0_0_10px_rgba(61,155,255,0.1)]">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-gray-100 font-mono">SYSTEM <span className="text-primary">DIAGNOSTICS</span></h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] text-primary/70 font-mono tracking-wider">
                {loopStatus === 'continue' ? 'PROCESSING' : loopStatus === 'done' ? 'COMPLETE' : loopStatus === 'blocked' ? 'WAITING' : 'ONLINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-[10px] font-mono text-gray-500">
          {loopStatus === 'continue' && (
            <div className="flex items-center gap-2">
              <RotateCw className="w-3 h-3 text-primary animate-spin" />
              <span>ITERATION: <span className="text-primary">{iterationCount}</span></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-gray-600" />
            <span>NET: <span className="text-primary">CONNECTED</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-gray-600" />
            <span>CPU: <span className="text-primary">OPTIMAL</span></span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <Terminal className="w-16 h-16 mb-4 text-gray-700" />
            <p className="text-sm font-mono">AWAITING INPUT...</p>
            <p className="text-xs font-mono mt-2 text-gray-600">Powered by Gemini LLM</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatBubble
            key={idx}
            message={msg}
            onApprove={() => handleApprove(idx)}
            onReject={() => handleReject(idx)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-background border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Enter diagnostic command or query..."
            className="relative w-full bg-panel border border-gray-700/50 rounded-xl pl-5 pr-32 py-4 text-text font-mono text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-lg placeholder-gray-600"
            disabled={loading}
          />
          <div className="absolute right-2 top-2 bottom-2">
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-full px-6 bg-primary hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="font-mono text-xs">EXECUTE</span>
            </button>
          </div>
        </div>
        <div className="text-center mt-3 text-[10px] text-gray-600 font-mono tracking-widest">
          TERMINAL RUN v2.0 • GEMINI POWERED • AUTONOMOUS MODE
        </div>
      </div>
    </div>
  )
}

export default App
