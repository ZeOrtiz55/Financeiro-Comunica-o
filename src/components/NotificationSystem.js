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

  const handleNotifClick = (n) => {
    const basePath = '/home-financeiro' 
    
    if (n.registro_id) {
      // Navega para a home passando ID e TIPO para abrir o card
      router.push(`${basePath}?id=${n.registro_id}&tipo=${n.tipo_fluxo}`)
    } else if (n.tipo === 'chat_geral') {
      // Abre o chat geral (modal lateral ou global)
      if (setIsChatOpen) setIsChatOpen(true)
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

    const channel = supabase.channel(`global_realtime_notifs_${userProfile.id}`)
      
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'mensagens_chat' 
      }, async (payload) => {
        if (String(payload.new.usuario_id) === String(userProfile.id)) return

        const autor = payload.new.usuario_nome || "Alguém"
        let titulo = "NOVA MENSAGEM"
        let msg = payload.new.texto
        let registro_id = null
        let tipo_fluxo = ""
        let nome_card = ""

        // Identificação de onde veio a mensagem
        if (payload.new.chamado_id) {
          const { data } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
          nome_card = data?.nom_cliente || "Boleto"
          registro_id = payload.new.chamado_id
          tipo_fluxo = "boleto"
          msg = `${autor} enviou no card ${nome_card}: "${payload.new.texto}"`
        } 
        else if (payload.new.pagar_id) {
          const { data } = await supabase.from('finan_pagar').select('fornecedor').eq('id', payload.new.pagar_id).single()
          nome_card = data?.fornecedor || "Fornecedor"
          registro_id = payload.new.pagar_id
          tipo_fluxo = "pagar"
          msg = `${autor} enviou em Contas a Pagar (${nome_card})`
        }
        else if (payload.new.receber_id) {
          const { data } = await supabase.from('finan_receber').select('cliente').eq('id', payload.new.receber_id).single()
          nome_card = data?.cliente || "Cliente"
          registro_id = payload.new.receber_id
          tipo_fluxo = "receber"
          msg = `${autor} enviou em Contas a Receber (${nome_card})`
        }
        else if (payload.new.rh_id) {
          const { data } = await supabase.from('finan_rh').select('funcionario').eq('id', payload.new.rh_id).single()
          nome_card = data?.funcionario || "RH"
          registro_id = payload.new.rh_id
          tipo_fluxo = "rh"
          msg = `${autor} enviou no chamado de RH (${nome_card})`
        }
        else {
          tipo_fluxo = "chat_geral"
          msg = `${autor} enviou no Chat Geral: "${payload.new.texto}"`
        }

        const novaNotif = { titulo, mensagem: msg, data: new Date().toISOString(), tipo: 'chat', registro_id, tipo_fluxo }
        setNotificacoes(prev => [novaNotif, ...prev]); addToast(novaNotif)
      })

      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'Chamado_NF' 
      }, (payload) => {
        if (payload.old.status !== payload.new.status) {
          const novaNotif = { 
            titulo: "CARD MOVIMENTADO", 
            mensagem: `O card de ${payload.new.nom_cliente} foi movido para ${payload.new.status.toUpperCase()}`, 
            data: new Date().toISOString(), 
            tipo: 'movimento',
            registro_id: payload.new.id,
            tipo_fluxo: 'boleto'
          }
          setNotificacoes(prev => [novaNotif, ...prev]); addToast(novaNotif)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  return (
    <>
      <div style={{ position: 'fixed', bottom: '35px', right: '125px', zIndex: 2050 }}>
        <div onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer', position: 'relative', background: '#fff', width: '75px', height: '75px', borderRadius: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #dcdde1' }}>
          <Bell size={30} color={notificacoes.length > 0 ? "#ef4444" : "#475569"} />
          {notificacoes.length > 0 && (
            <div style={{ position: 'absolute', top: '18px', right: '18px', background: '#ef4444', color: '#fff', fontSize: '12px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {notificacoes.length}
            </div>
          )}
        </div>

        {showDropdown && (
          <div style={{ position: 'absolute', bottom: '90px', right: 0, width: '400px', background: '#fff', borderRadius: '0px', boxShadow: '0 40px 80px rgba(0,0,0,0.25)', border: '1px solid #dcdde1', zIndex: 9999, padding: '25px', maxHeight: '500px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1.5px' }}>CENTRAL DE NOTIFICAÇÕES</span>
              <button onClick={() => setNotificacoes([])} style={{ background: '#fff1f2', border: 'none', color: '#ef4444', padding: '6px 12px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>LIMPAR</button>
            </div>
            {notificacoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Nenhuma novidade.</p>
            ) : notificacoes.map((n, i) => (
              <div key={i} onClick={() => handleNotifClick(n)} style={{ padding: '15px', border: '1px solid #f1f5f9', marginBottom: '10px', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                <div style={{ width: '45px', height: '45px', background: n.tipo === 'chat' ? '#f5f3ff' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {n.tipo === 'chat' ? <MessageSquare size={20} color="#8b5cf6" /> : <RefreshCw size={20} color="#2563eb" />}
                </div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: '13px', color: '#0f172a' }}>{n.titulo}</b>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>{n.mensagem}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', top: '30px', right: '30px', zIndex: 100000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => handleNotifClick(t)} style={{ pointerEvents: 'auto', background: '#fff', borderLeft: `6px solid ${t.tipo === 'chat' ? '#8b5cf6' : '#2563eb'}`, padding: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', minWidth: '350px', display: 'flex', gap: '15px', cursor: 'pointer', border: '1px solid #dcdde1' }}>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>{t.titulo}</b>
              <p style={{ fontSize: '15px', margin: '5px 0', color: '#1e293b', fontWeight: '600' }}>{t.mensagem}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}