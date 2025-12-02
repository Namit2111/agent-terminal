import { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  Cpu,
  Wifi,
  Activity,
  Send,
  Loader2
} from 'lucide-react'
import './App.css'
import { ChatMessage, AgentResponse } from './types'
import { ChatBubble } from './components/ChatBubble'

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const executeCommand = async (command: string) => {
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('execute-command', command)
      return result.output
    } catch (error) {
      return `Error: ${error}`
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg: ChatMessage = { sender: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      })
      const data: AgentResponse = await res.json()

      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: data.message,
        proposal: data.proposal
      }

      if (data.proposal) {
        if (data.proposal.severity === 'low') {
          const output = await executeCommand(data.proposal.command)
          agentMsg.executionResult = output
        } else {
          agentMsg.isApprovalRequest = true
        }
      }

      setMessages(prev => [...prev, agentMsg])
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'agent', text: 'Error connecting to backend.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (index: number) => {
    const msg = messages[index]
    if (!msg.proposal) return

    const output = await executeCommand(msg.proposal.command)

    setMessages(prev => {
      const newMsgs = [...prev]
      newMsgs[index] = { ...msg, isApprovalRequest: false, executionResult: output }
      return newMsgs
    })
  }

  const handleReject = (index: number) => {
    setMessages(prev => {
      const newMsgs = [...prev]
      newMsgs[index] = { ...newMsgs[index], isApprovalRequest: false }
      return newMsgs
    })
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="px-6 py-4 bg-panel/50 backdrop-blur-md border-b border-gray-800 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shadow-[0_0_15px_rgba(61,155,255,0.1)]">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-gray-100">PC DOCTOR <span className="text-primary">AGENT</span></h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-gray-400 font-mono">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-mono text-gray-500">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <span>NET: CONNECTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            <span>CPU: OPTIMAL</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <Terminal className="w-16 h-16 mb-4 text-gray-700" />
            <p className="text-sm font-mono">AWAITING INPUT...</p>
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
      <div className="p-6 bg-background/80 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe your PC issue..."
            className="w-full bg-panel border border-gray-700 rounded-xl pl-5 pr-32 py-4 text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-lg placeholder-gray-600"
            disabled={loading}
          />
          <div className="absolute right-2 top-2 bottom-2">
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-full px-6 bg-primary hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
        <div className="text-center mt-2 text-[10px] text-gray-600 font-mono">
          AI AGENT v1.0 • SECURE CONNECTION • SYSTEM ACCESS GRANTED
        </div>
      </div>
    </div>
  )
}

export default App
