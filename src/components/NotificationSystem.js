'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, RefreshCw, MessageSquare, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotificationSystem({ userProfile, setIsChatOpen }) {
  const [notificacoes, setNotificacoes] = useState([])
  const [toasts, setToasts] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()

  // Rota correta baseada na função do usuário
  const rotaHome = userProfile?.funcao === 'Financeiro' ? '/home-financeiro' : '/home-posvendas'

  const handleNotifClick = (n) => {
    setShowDropdown(false)
    setNotificacoes(prev => prev.filter(item => item !== n))

    // Mensagem do chat geral (sem vínculo a card): abre o chat da sidebar
    if (!n.registro_id) {
      if (setIsChatOpen) setIsChatOpen(true)
      return
    }

    // Navega para a página correta passando id e tipo como query params
    router.push(`${rotaHome}?id=${n.registro_id}&tipo=${n.tipo_fluxo}`)
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

    // Canal único por usuário para evitar conflitos entre abas/sessões
    const channel = supabase.channel(`notifs_${userProfile.id}`)

      // --- 1. MENSAGENS DO CHAT ---
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagens_chat'
      }, async (payload) => {
        // Ignora próprias mensagens
        if (String(payload.new.usuario_id) === String(userProfile.id)) return

        const autor = payload.new.usuario_nome || 'Alguém'
        let nome_card = 'Chat Geral'
        let tipo_fluxo = 'chat_geral'
        let registro_id = null

        if (payload.new.chamado_id) {
          const { data } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
          nome_card = data?.nom_cliente || 'Boleto'
          registro_id = payload.new.chamado_id
          tipo_fluxo = 'boleto'
        } else if (payload.new.pagar_id) {
          const { data } = await supabase.from('finan_pagar').select('fornecedor').eq('id', payload.new.pagar_id).single()
          nome_card = data?.fornecedor || 'Conta a Pagar'
          registro_id = payload.new.pagar_id
          tipo_fluxo = 'pagar'
        } else if (payload.new.receber_id) {
          const { data } = await supabase.from('finan_receber').select('cliente').eq('id', payload.new.receber_id).single()
          nome_card = data?.cliente || 'Conta a Receber'
          registro_id = payload.new.receber_id
          tipo_fluxo = 'receber'
        } else if (payload.new.rh_id) {
          const { data } = await supabase.from('finan_rh').select('funcionario').eq('id', payload.new.rh_id).single()
          nome_card = data?.funcionario || 'RH'
          registro_id = payload.new.rh_id
          tipo_fluxo = 'rh'
        }

        const novaNotif = {
          id: Date.now(),
          titulo: registro_id ? 'NOVA MENSAGEM NO CARD' : 'NOVA MENSAGEM NO CHAT',
          mensagem: `${autor}: "${payload.new.texto}"${registro_id ? ` — ${nome_card}` : ''}`,
          data: new Date().toISOString(),
          tipo: 'chat',
          registro_id,
          tipo_fluxo
        }
        setNotificacoes(prev => [novaNotif, ...prev])
        addToast(novaNotif)
      })

      // --- 2. MOVIMENTAÇÃO DE CARDS (BOLETOS) ---
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'Chamado_NF'
      }, (payload) => {
        if (payload.old.status !== payload.new.status) {
          const statusLabel = {
            gerar_boleto: 'Gerar Boleto',
            enviar_cliente: 'Enviar ao Cliente',
            aguardando_vencimento: 'Aguardando Vencimento',
            vencido: 'Vencido',
            pago: 'Pago',
            concluido: 'Concluído',
          }
          const novaNotif = {
            id: Date.now(),
            titulo: 'CARD MOVIMENTADO',
            mensagem: `${payload.new.nom_cliente} → ${statusLabel[payload.new.status] || payload.new.status.toUpperCase()}`,
            data: new Date().toISOString(),
            tipo: 'movimento',
            registro_id: payload.new.id,
            tipo_fluxo: 'boleto'
          }
          setNotificacoes(prev => [novaNotif, ...prev])
          addToast(novaNotif)
        }
      })

      // --- 3. NOVO LANÇAMENTO PAGAR ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'finan_pagar' }, (payload) => {
        const novaNotif = {
          id: Date.now(),
          titulo: 'NOVO PAGAMENTO',
          mensagem: `${payload.new.fornecedor} — R$ ${payload.new.valor}`,
          data: new Date().toISOString(),
          tipo: 'movimento',
          registro_id: payload.new.id,
          tipo_fluxo: 'pagar'
        }
        setNotificacoes(prev => [novaNotif, ...prev]); addToast(novaNotif)
      })

      // --- 4. NOVO LANÇAMENTO RECEBER ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'finan_receber' }, (payload) => {
        const novaNotif = {
          id: Date.now(),
          titulo: 'NOVO RECEBIMENTO',
          mensagem: `${payload.new.cliente} — R$ ${payload.new.valor}`,
          data: new Date().toISOString(),
          tipo: 'movimento',
          registro_id: payload.new.id,
          tipo_fluxo: 'receber'
        }
        setNotificacoes(prev => [novaNotif, ...prev]); addToast(novaNotif)
      })

      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  // Não renderiza nada se não há usuário logado
  if (!userProfile) return null

  return (
    <>
      {/* ÍCONE DO SININHO */}
      <div style={{ position: 'fixed', bottom: '35px', right: '125px', zIndex: 2050 }}>
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ cursor: 'pointer', position: 'relative', background: '#fff', width: '75px', height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #dcdde1' }}
        >
          <Bell size={30} color={notificacoes.length > 0 ? '#0ea5e9' : '#475569'} />
          {notificacoes.length > 0 && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: '#fff', fontSize: '11px', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {notificacoes.length > 9 ? '9+' : notificacoes.length}
            </div>
          )}
        </div>

        {/* DROPDOWN */}
        {showDropdown && (
          <div style={{ position: 'absolute', bottom: '90px', right: 0, width: '420px', background: '#fff', boxShadow: '0 40px 80px rgba(0,0,0,0.25)', border: '1px solid #dcdde1', zIndex: 9999, padding: '20px', maxHeight: '480px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1.5px' }}>CENTRAL DE NOTIFICAÇÕES</span>
              <button onClick={() => setNotificacoes([])} style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '5px 10px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>LIMPAR</button>
            </div>

            {notificacoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '20px' }}>Nenhuma novidade no momento.</p>
            ) : notificacoes.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                style={{ padding: '14px', borderBottom: '1px solid #f1f5f9', cursor: n.registro_id || setIsChatOpen ? 'pointer' : 'default', display: 'flex', gap: '12px', transition: '0.2s' }}
              >
                <div style={{ width: '40px', height: '40px', background: n.tipo === 'chat' ? '#f0f9ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}>
                  {n.tipo === 'chat' ? <MessageSquare size={18} color="#0ea5e9" /> : <RefreshCw size={18} color="#64748b" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: '11px', color: '#0f172a', display: 'block' }}>{n.titulo}</b>
                  <p style={{ fontSize: '12px', color: '#475569', margin: '3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.mensagem}</p>
                  <small style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(n.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                {(n.registro_id || setIsChatOpen) && <ChevronRight size={14} color="#cbd5e1" style={{ alignSelf: 'center', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOASTS */}
      <div style={{ position: 'fixed', top: '30px', right: '30px', zIndex: 100000, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => handleNotifClick(t)}
            style={{ pointerEvents: 'auto', background: '#fff', borderLeft: `5px solid ${t.tipo === 'chat' ? '#0ea5e9' : '#1e293b'}`, padding: '16px 20px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', minWidth: '360px', maxWidth: '420px', display: 'flex', gap: '12px', cursor: 'pointer', border: '1px solid #dcdde1' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>{t.titulo}</b>
              <p style={{ fontSize: '13px', margin: '4px 0 0', color: '#1e293b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.mensagem}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
