'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, X, RefreshCw, MessageSquare, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotificationSystem({ userProfile, setIsChatOpen }) {
  const [notificacoes, setNotificacoes] = useState([])
  const [toasts, setToasts] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()

  // Função para lidar com o clique na notificação e ir direto ao assunto (Card específico)
  const handleNotifClick = (n) => {
    const cardId = n.chamado_id || n.id_registro;
    const kanbanPath = userProfile?.funcao === 'Financeiro' ? '/kanban-financeiro' : '/kanban';

    if (n.tipo === 'chat') {
      if (cardId) {
        // Navega para o Kanban enviando o ID do card na URL para o assunto ser aberto
        router.push(`${kanbanPath}?id=${cardId}`)
      } else {
        // Se for chat geral (sem chamado_id), abre o modal do chat na tela atual
        if (setIsChatOpen) setIsChatOpen(true)
      }
    } else if (n.tipo === 'movimento') {
      // Navega para o Kanban focando no card que foi movimentado
      router.push(`${kanbanPath}?id=${cardId}`)
    }
    setShowDropdown(false)
  }

  const addToast = (notif) => {
    const id = Date.now()
    setToasts(prev => [{ ...notif, id }, ...prev])
    
    try {
      const somEscolhido = userProfile?.som_notificacao || 'som-notificacao-1.mp3'
      const audio = new Audio(`/${somEscolhido}`)
      audio.play().catch(() => {})
    } catch (e) {}

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 8000)
  }

  useEffect(() => {
    if (!userProfile?.id) return

    const channel = supabase.channel(`global_realtime_${userProfile.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'mensagens_chat' 
      }, async (payload) => {
        if (String(payload.new.usuario_id) === String(userProfile.id)) return

        let titulo = "MENSAGEM GERAL"
        let msg = payload.new.texto
        let chamado_id = payload.new.chamado_id
        
        if (chamado_id) {
          const { data: card } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', chamado_id).single()
          titulo = "CHAT NO CARD"
          msg = `${card?.nom_cliente || 'Boleto'}: ${payload.new.texto}`
        }

        const novaNotif = { titulo, mensagem: msg, data: new Date().toISOString(), tipo: 'chat', chamado_id }
        setNotificacoes(prev => [novaNotif, ...prev])
        addToast(novaNotif)
      })

      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'Chamado_NF' 
      }, (payload) => {
        if (payload.old.status !== payload.new.status) {
          const novaNotif = { 
            titulo: "FLUXO ATUALIZADO", 
            mensagem: `${payload.new.nom_cliente} moveu para ${payload.new.status.toUpperCase()}`, 
            data: new Date().toISOString(), 
            tipo: 'movimento',
            id_registro: payload.new.id
          }
          setNotificacoes(prev => [novaNotif, ...prev])
          addToast(novaNotif)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  return (
    <>
      {/* SINO POSICIONADO AO LADO DO CHAT (BOTTOM RIGHT) */}
      <div style={{ position: 'fixed', bottom: '35px', right: '125px', zIndex: 2050 }}>
        <div 
          onClick={() => setShowDropdown(!showDropdown)} 
          style={{ 
            cursor: 'pointer', 
            position: 'relative',
            background: '#fff',
            width: '75px',
            height: '75px',
            borderRadius: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            transition: '0.3s',
            border: '1px solid #f1f5f9'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Bell size={30} color={notificacoes.length > 0 ? "#ef4444" : "#475569"} style={{ animation: notificacoes.length > 0 ? 'pulse 2s infinite' : 'none' }} />
          {notificacoes.length > 0 && (
            <div style={{ position: 'absolute', top: '18px', right: '18px', background: '#ef4444', color: '#fff', fontSize: '12px', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '3px solid #fff' }}>
              {notificacoes.length}
            </div>
          )}
        </div>

        {/* DROPDOWN ESTILIZADO */}
        {showDropdown && (
          <div style={{ position: 'absolute', bottom: '90px', right: 0, width: '380px', background: '#fff', borderRadius: '30px', boxShadow: '0 40px 80px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', zIndex: 9999, padding: '25px', maxHeight: '500px', overflowY: 'auto', animation: 'zoomIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1.5px' }}>NOTIFICAÇÕES</span>
              <button onClick={() => setNotificacoes([])} style={{ background: '#fff1f2', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>LIMPAR TUDO</button>
            </div>
            
            {notificacoes.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Bell size={40} color="#e2e8f0" style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Tudo em dia por aqui.</p>
              </div>
            )}

            {notificacoes.map((n, i) => (
              <div 
                key={i} 
                onClick={() => handleNotifClick(n)}
                style={{ 
                  padding: '15px', 
                  borderRadius: '20px',
                  marginBottom: '10px',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: n.tipo === 'chat' ? '#f5f3ff' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {n.tipo === 'chat' ? <MessageSquare size={20} color="#8b5cf6" /> : <RefreshCw size={20} color="#2563eb" />}
                </div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{n.titulo}</b>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 5px 0', lineHeight: '1.4' }}>{n.mensagem}</p>
                  <small style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '600' }}>{new Date(n.data).toLocaleTimeString()}</small>
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOASTS (NOTIFICAÇÕES FLUTUANTES) */}
      <div style={{ position: 'fixed', top: '30px', right: '30px', zIndex: 100000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            onClick={() => handleNotifClick(t)}
            style={{ 
              pointerEvents: 'auto', 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(10px)',
              borderLeft: `6px solid ${t.tipo === 'chat' ? '#8b5cf6' : '#2563eb'}`, 
              padding: '20px', 
              borderRadius: '20px', 
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)', 
              minWidth: '350px', 
              maxWidth: '450px',
              animation: 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              display: 'flex',
              gap: '15px',
              cursor: 'pointer',
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: t.tipo === 'chat' ? '#f5f3ff' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
               {t.tipo === 'chat' ? <MessageSquare size={24} color="#8b5cf6" /> : <RefreshCw size={24} color="#2563eb" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <b style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>{t.titulo}</b>
                <X size={16} onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(x => x.id !== t.id)) }} style={{ cursor: 'pointer', opacity: 0.5 }} />
              </div>
              <p style={{ fontSize: '15px', margin: '5px 0 0 0', color: '#1e293b', fontWeight: '600', lineHeight: '1.4' }}>{t.mensagem}</p>
              <small style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', display: 'block' }}>Clique para visualizar</small>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{` 
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } 
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } 
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  )
}