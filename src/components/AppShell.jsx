import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listConversations, deleteConversation, renameConversation } from '../lib/conversations'
import Sidebar from './Sidebar'
import SettingsModal from './SettingsModal'
import './AppShell.css'

export default function AppShell() {
  const { user } = useAuth()
  const { id: activeId } = useParams()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingTool, setPendingTool] = useState(null)
  const [newChatNonce, setNewChatNonce] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('ielts-ai-sidebar-collapsed') === '1')

  useEffect(() => {
    localStorage.setItem('ielts-ai-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const refreshConversations = useCallback(async () => {
    if (!user) return
    try {
      const rows = await listConversations(user.id)
      setConversations(rows)
    } catch {
      // conversations table may not exist yet if the migration hasn't run — fail quietly
    }
  }, [user])

  useEffect(() => { refreshConversations() }, [refreshConversations])

  const handleDelete = async (id) => {
    await deleteConversation(id).catch(() => {})
    setConversations(prev => prev.filter(c => c.id !== id))
    if (id === activeId) navigate('/chat')
  }

  const handleRename = async (id, title) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    await renameConversation(id, title).catch(() => {})
  }

  return (
    <div className="shell shell--sidebar">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onDelete={handleDelete}
        onRename={handleRename}
        onNewChat={() => setNewChatNonce(n => n + 1)}
        onOpenWriting={() => setPendingTool('writing')}
        onOpenSpeaking={() => setPendingTool('speaking')}
        user={user}
        mobileOpen={mobileOpen}
        onOpenMobile={() => setMobileOpen(true)}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <main className="shell-main">
        <Outlet context={{
          conversations, refreshConversations,
          pendingTool, clearPendingTool: () => setPendingTool(null),
          newChatNonce,
        }} />
      </main>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
