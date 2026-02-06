'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, X, RefreshCw, MessageSquare, Trash } from 'lucide-react'

export default function NotificationSystem({ userProfile }) {
  const [notificacoes, setNotificacoes] = useState([]) // Histórico do sino
  const [toasts, setToasts] = useState([]) // Pop-ups ativos
  const [showDropdown, setShowDropdown] = useState(false)

  // Função para disparar o pop-up e o som
  const addToast = (notif) => {
    const id = Date.now()
    setToasts(prev => [{ ...notif, id }, ...prev])
    
    try {
      const som = userProfile?.som_notificacao || 'som-notificacao-1.mp3.mp3'
      new Audio(`/${som}`).play().catch(() => {})
    } catch (e) {}

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 8000)
  }

  useEffect(() => {
    if (!userProfile?.id) return

    // 1. Ouvir NOVAS MENSAGENS (Realtime)
    const channelChat = supabase.channel('notif_global_chat').on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'mensagens_chat' 
    }, async (payload) => {
      if (payload.new.usuario_id === userProfile.id) return

      let titulo = "MENSAGEM GERAL"
      let msg = payload.new.texto
      
      if (payload.new.chamado_id) {
        const { data: card } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
        titulo = "CHAT NO CARD"
        msg = `[ID #${payload.new.chamado_id}] ${card?.nom_cliente}: ${payload.new.texto}`
      }

      const novaNotif = { titulo, mensagem: msg, data: new Date().toISOString(), tipo: 'chat' }
      setNotificacoes(prev => [novaNotif, ...prev])
      addToast(novaNotif)
    }).subscribe()

    // 2. Ouvir MOVIMENTAÇÕES DE CARDS
    const channelCards = supabase.channel('notif_global_cards').on('postgres_changes', { 
      event: 'UPDATE', schema: 'public', table: 'Chamado_NF' 
    }, (payload) => {
      if (payload.old.status !== payload.new.status) {
        const info = payload.new
        const novaNotif = { 
          titulo: "CARD MOVIMENTADO", 
          mensagem: `${info.nom_cliente} foi para ${info.status.toUpperCase()}`, 
          data: new Date().toISOString(), 
          tipo: 'movimento' 
        }
        setNotificacoes(prev => [novaNotif, ...prev])
        addToast(novaNotif)
      }
    }).subscribe()

    return () => {
      supabase.removeChannel(channelChat)
      supabase.removeChannel(channelCards)
    }
  }, [userProfile])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* SINO */}
      <div onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer', position: 'relative' }}>
        <Bell size={32} color="#0f172a" />
        {notificacoes.length > 0 && (
          <div style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
            {notificacoes.length}
          </div>
        )}
      </div>

      {/* DROPDOWN DO HISTÓRICO */}
      {showDropdown && (
        <div onMouseLeave={() => setShowDropdown(false)} style={{ position: 'absolute', top: '45px', right: 0, width: '380px', background: '#fff', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', zIndex: 9999, padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>NOTIFICAÇÕES RECENTES</span>
            <button onClick={() => setNotificacoes([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>LIMPAR</button>
          </div>
          {notificacoes.length === 0 && <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>Nenhuma novidade.</p>}
          {notificacoes.map((n, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <b style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>{n.titulo}</b>
              <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0' }}>{n.mensagem}</p>
              <small style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(n.data).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY DE TOASTS (POP-UPS) */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#fff', borderLeft: `8px solid ${t.tipo === 'chat' ? '#8b5cf6' : '#2563eb'}`, padding: '18px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', minWidth: '320px', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b style={{ fontSize: '11px', color: t.tipo === 'chat' ? '#8b5cf6' : '#2563eb' }}>{t.titulo}</b>
              <X size={14} onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ cursor: 'pointer' }} />
            </div>
            <p style={{ fontSize: '14px', margin: '8px 0', color: '#1e293b' }}>{t.mensagem}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}