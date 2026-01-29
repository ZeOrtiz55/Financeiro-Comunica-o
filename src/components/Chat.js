'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [unreadCount, setUnreadCount] = useState(0) // Contador de novas
  const scrollRef = useRef()
  
  // Ref para rastrear se o chat está aberto sem causar re-render no useEffect do Supabase
  const isOpenRef = useRef(isOpen)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnreadCount(0) // Zera ao abrir
  }, [isOpen])

  // Função para tocar o som
  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3') // Som de "ping"
    audio.play().catch(e => console.log("Som bloqueado pelo navegador até interação do usuário."))
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          // 1. Só adiciona se não for duplicada
          setMensagens((prev) => {
            const jaExiste = prev.find(m => m.id === payload.new.id)
            if (jaExiste) return prev
            return [...prev, payload.new]
          })

          // 2. Se a mensagem for de OUTRO usuário...
          if (payload.new.usuario_id !== userProfile.id) {
            playNotificationSound() // Toca o som

            // 3. Se o chat estiver fechado, aumenta o contador
            if (!isOpenRef.current) {
              setUnreadCount(prev => prev + 1)
            }
          }
        }
      )
      .subscribe()

    const carregarHistorico = async () => {
      const { data } = await supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      if (data) setMensagens(data)
    }
    carregarHistorico()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile.id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens, isOpen])

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    const msgTemporaria = { 
      texto: novaMsg, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id,
      id: Math.random() 
    }

    setMensagens(prev => [...prev, msgTemporaria])
    const textoParaEnviar = novaMsg
    setNovaMsg('')

    await supabase.from('mensagens_chat').insert([{ 
      texto: textoParaEnviar, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      {/* BOTÃO FLUTUANTE COM NOTIFICAÇÃO */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          width: '60px', height: '60px', borderRadius: '50%', 
          background: '#22c55e', color: 'white', border: 'none', 
          fontSize: '24px', cursor: 'pointer', position: 'relative',
          boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)' 
        }}
      >
        {isOpen ? '✕' : '💬'}

        {/* BOLINHA DE NOTIFICAÇÃO (BADGE) */}
        {!isOpen && unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: '#ef4444', color: 'white', fontSize: '12px',
            fontWeight: 'bold', width: '22px', height: '22px',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '2px solid white'
          }}>
            {unreadCount}
          </div>
        )}
      </button>

      {/* JANELA DE CHAT */}
      {isOpen && (
        <div style={{ ...glassStyle, position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '450px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.1)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#14532d' }}>Dúvidas Nova Tratores</h4>
            <span style={{ fontSize: '10px', color: '#22c55e' }}>● Online agora</span>
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mensagens.map((m) => (
              <div key={m.id} style={{ 
                alignSelf: m.usuario_id === userProfile.id ? 'flex-end' : 'flex-start',
                maxWidth: '80%', padding: '10px 15px', borderRadius: '15px',
                background: m.usuario_id === userProfile.id ? '#22c55e' : 'white',
                color: m.usuario_id === userProfile.id ? 'white' : 'black',
                fontSize: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}>
                <p style={{ margin: 0, fontSize: '9px', opacity: 0.7, fontWeight: 'bold' }}>{m.usuario_nome}</p>
                <p style={{ margin: 0 }}>{m.texto}</p>
              </div>
            ))}
          </div>

          <form onSubmit={enviarMensagem} style={{ padding: '15px', display: 'flex', gap: '10px' }}>
            <input value={novaMsg} onChange={(e) => setNovaMsg(e.target.value)} placeholder="Digite sua dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', fontSize: '12px' }} />
            <button style={{ background: '#14532d', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}