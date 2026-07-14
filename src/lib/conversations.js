import { supabase } from './supabase'

export async function listConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createConversation(userId, title = null) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function renameConversation(id, title) {
  const { error } = await supabase.from('conversations').update({ title }).eq('id', id)
  if (error) throw error
}

export async function touchConversation(id) {
  const { error } = await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteConversation(id) {
  const { error } = await supabase.from('conversations').delete().eq('id', id)
  if (error) throw error
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addMessage(conversationId, { role, type = 'text', content = null, data: payload = null }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, type, content, data: payload })
    .select()
    .single()
  if (error) throw error
  touchConversation(conversationId).catch(() => {})
  return data
}
