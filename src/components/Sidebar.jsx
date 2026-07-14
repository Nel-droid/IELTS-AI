import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { Logo } from './Logo'
import { IconWriting, IconSpeaking, IconPlus, IconEdit, IconTrash, IconMenu, IconX, IconSidebar } from './icons'
import './Sidebar.css'

function timeAgo(iso, t) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return t('sidebar.justNow')
  if (diff < 3600) return t('sidebar.minsAgo', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('sidebar.hoursAgo', { n: Math.floor(diff / 3600) })
  if (diff < 86400 * 7) return t('sidebar.daysAgo', { n: Math.floor(diff / 86400) })
  return new Date(iso).toLocaleDateString()
}

export default function Sidebar({
  conversations, activeId, onDelete, onRename, onNewChat, onOpenWriting, onOpenSpeaking,
  user, mobileOpen, onCloseMobile, onOpenMobile, onOpenSettings, collapsed, onToggleCollapse,
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const displayName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? ''
  const initial = displayName.charAt(0).toUpperCase()
  const avatarUrl = user?.user_metadata?.avatar_url

  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)

  const goNewChat = () => {
    navigate('/chat')
    onNewChat?.()
    onCloseMobile?.()
  }

  const startRename = (c) => {
    setEditingId(c.id)
    setEditValue(c.title || '')
    requestAnimationFrame(() => editInputRef.current?.select())
  }

  const commitRename = (id) => {
    const title = editValue.trim()
    setEditingId(null)
    if (title) onRename(id, title)
  }

  return (
    <>
      <button className="sidebar-mobile-toggle" onClick={onOpenMobile} aria-label="Open menu">
        <IconMenu />
      </button>

      {collapsed && (
        <button className="sidebar-expand-btn" onClick={onToggleCollapse} aria-label="Show sidebar" title="Show sidebar">
          <IconSidebar />
        </button>
      )}

      {mobileOpen && <div className="sidebar-scrim" onClick={onCloseMobile} />}

      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <Logo size={26} />
            <span>IELTS AI</span>
          </div>
          <div className="sidebar-top-actions">
            <button className="sidebar-toggle-btn" onClick={onToggleCollapse} aria-label="Hide sidebar" title="Hide sidebar">
              <IconSidebar />
            </button>
            <button className="sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close menu">
              <IconX />
            </button>
          </div>
        </div>

        <button className="sidebar-newchat" onClick={goNewChat}>
          <IconPlus /> {t('sidebar.newChat')}
        </button>

        <div className="sidebar-section">
          <p className="sidebar-label">{t('sidebar.skills')}</p>
          <button className="sidebar-item sidebar-item--skill" onClick={() => { onOpenWriting(); onCloseMobile?.() }}>
            <span className="sidebar-item-icon sidebar-item-icon--writing"><IconWriting /></span>
            {t('chat.checkWriting')}
          </button>
          <button className="sidebar-item sidebar-item--skill" onClick={() => { onOpenSpeaking(); onCloseMobile?.() }}>
            <span className="sidebar-item-icon sidebar-item-icon--speaking"><IconSpeaking /></span>
            {t('chat.practiceSpeaking')}
          </button>
        </div>

        <div className="sidebar-section sidebar-section--chats">
          <p className="sidebar-label">{t('sidebar.chats')}</p>
          <div className="sidebar-chat-list">
            {conversations.length === 0 && (
              <p className="sidebar-empty">{t('sidebar.noChats')}</p>
            )}
            {conversations.map(c => (
              editingId === c.id ? (
                <div key={c.id} className="sidebar-chat-item sidebar-chat-item--editing">
                  <input
                    ref={editInputRef}
                    className="sidebar-chat-edit-input"
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitRename(c.id) }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                    }}
                  />
                </div>
              ) : (
                <NavLink
                  key={c.id}
                  to={`/chat/${c.id}`}
                  onClick={() => onCloseMobile?.()}
                  className={`sidebar-chat-item${c.id === activeId ? ' sidebar-chat-item--active' : ''}`}
                >
                  <span className="sidebar-chat-title">{c.title || t('sidebar.untitled')}</span>
                  <span className="sidebar-chat-time">{timeAgo(c.updated_at, t)}</span>
                  <span className="sidebar-chat-actions">
                    <button
                      className="sidebar-chat-action"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); startRename(c) }}
                      aria-label={t('sidebar.renameChat')}
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="sidebar-chat-action sidebar-chat-action--danger"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(c.id) }}
                      aria-label={t('sidebar.deleteChat')}
                    >
                      <IconTrash />
                    </button>
                  </span>
                </NavLink>
              )
            ))}
          </div>
        </div>

        <button className="sidebar-profile" onClick={onOpenSettings}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="sidebar-profile-avatar" />
          ) : (
            <span className="sidebar-profile-avatar sidebar-profile-avatar--fallback">{initial}</span>
          )}
          <span className="sidebar-profile-name">{displayName}</span>
        </button>
      </aside>
    </>
  )
}
