'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef = useRef()
  
  // Ref para rastrear se o chat está aberto dentro da escuta do Supabase
  const isOpenRef = useRef(isOpen)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) {
      setUnreadCount(0) // Zera as notificações ao abrir a janela
    }
  }, [isOpen])

  // Função para tocar o som local
  const playNotificationSound = () => {
    try {
      // Busca o arquivo notificacao.mp3 que você colocou na pasta public/
      const audio = new Audio('/notificacao.mp3') 
      audio.volume = 0.5
      audio.play().catch(e => console.log("Áudio aguardando interação do usuário."))
    } catch (err) {
      console.log("Erro ao carregar arquivo de som:", err)
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          // 1. Adiciona a nova mensagem na lista
          setMensagens((prev) => {
            const jaExiste = prev.find(m => m.id === payload.new.id)
            if (jaExiste) return prev
            return [...prev, payload.new]
          })

          // 2. Lógica de Notificação (SÓ SE NÃO FOR EU)
          // Usamos String() para evitar erro se um ID for número e outro texto
          if (String(payload.new.usuario_id) !== String(userProfile?.id)) {
            playNotificationSound()

            // Se o chat estiver fechado, aumenta a bolinha vermelha
            if (!isOpenRef.current) {
              setUnreadCount(prev => prev + 1)
            }
          }
        }
      )
      .subscribe()

    // Busca o histórico ao carregar
    const carregarHistorico = async () => {
      const { data } = await supabase
        .from('mensagens_chat')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50)
      if (data) setMensagens(data)
    }
    carregarHistorico()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  // Scroll automático
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, isOpen])

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    const textoTemp = novaMsg
    setNovaMsg('')

    // Update otimista
    const msgTemporaria = { 
      texto: textoTemp, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id,
      id: Math.random() 
    }

    setMensagens(prev => [...prev, msgTemporaria])

    await supabase.from('mensagens_chat').insert([{ 
      texto: textoTemp, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      
      {/* BOTÃO E BOLINHA DE NOTIFICAÇÃO */}
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ 
            width: '65px', height: '65px', borderRadius: '50%', 
            background: '#22c55e', color: 'white', border: 'none', 
            fontSize: '28px', cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s active'
          }}
        >
          {isOpen ? '✕' : '💬'}
        </button>

        {/* BOLINHA VERMELHA (BADGE) */}
        {!isOpen && unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ff0000',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '22px',
            height: '22px',
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10001
          }}>
            {unreadCount}
          </div>
        )}
      </div>

      {/* JANELA DO CHAT */}
      {isOpen && (
        <div style={{ 
          position: 'absolute', bottom: '85px', right: 0, 
          width: '330px', height: '480px', background: 'white',
          borderRadius: '25px', display: 'flex', flexDirection: 'column', 
          boxShadow: '0 15px 40px rgba(0,0,0,0.2)', border: '1px solid #eee',
          overflow: 'hidden'
        }}>
          {/* TOPO */}
          <div style={{ padding: '15px 20px', background: '#22c55e', color: 'white' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>Chat Nova Tratores</h4>
            <span style={{ fontSize: '10px', opacity: 0.9 }}>Suporte online</span>
          </div>

          {/* MENSAGENS */}
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8f9fa' }}>
            {mensagens.map((m) => (
              <div key={m.id} style={{ 
                alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: '15px',
                background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : 'white',
                color: String(m.usuario_id) === String(userProfile.id) ? 'white' : '#333',
                fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                <b style={{ fontSize: '9px', display: 'block', marginBottom: '2px', opacity: 0.8 }}>{m.usuario_nome}</b>
                {m.texto}
              </div>
            ))}
          </div>

          {/* INPUT */}
          <form onSubmit={enviarMensagem} style={{ padding: '15px', display: 'flex', gap: '8px', background: 'white', borderTop: '1px solid #eee' }}>
            <input 
              value={novaMsg} 
              onChange={(e) => setNovaMsg(e.target.value)} 
              placeholder="Digite sua dúvida..." 
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', fontSize: '14px' }} 
            />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  )
}