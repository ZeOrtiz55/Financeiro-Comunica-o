'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef = useRef()
  
  const isOpenRef = useRef(isOpen)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notificacao.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log("Áudio bloqueado: interaja com a página."))
    } catch (err) {
      console.log("Erro ao tocar som:", err)
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          const msgRecebida = payload.new
          const meuId = String(userProfile?.id)
          const idRemetente = String(msgRecebida.usuario_id)

          // --- 1. RESOLVENDO A DUPLICAÇÃO ---
          setMensagens((prev) => {
            // Se a mensagem que chegou for MINHA, eu ignoro ela no Realtime
            // porque eu já adicionei ela na tela no momento que cliquei em "Enviar"
            if (idRemetente === meuId) {
              return prev
            }
            
            // Se for de OUTRA pessoa, verifica se já não existe (prevenção extra)
            const jaExiste = prev.find(m => m.id === msgRecebida.id)
            if (jaExiste) return prev
            
            return [...prev, msgRecebida]
          })

          // --- 2. RESOLVENDO SOM E BOLINHA ---
          if (idRemetente !== meuId) {
            playNotificationSound()

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
  }, [userProfile?.id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens, isOpen])

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    const textoTemp = novaMsg
    setNovaMsg('')

    // 1. Adiciono na MINHA tela imediatamente (Update Otimista)
    const msgOtimista = { 
      texto: textoTemp, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id,
      id: Date.now() // ID temporário
    }
    setMensagens(prev => [...prev, msgOtimista])

    // 2. Mando para o banco de dados
    await supabase.from('mensagens_chat').insert([{ 
      texto: textoTemp, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ 
            width: '65px', height: '65px', borderRadius: '50%', 
            background: '#22c55e', color: 'white', border: 'none', 
            fontSize: '28px', cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isOpen ? '✕' : '💬'}
        </button>

        {/* BOLINHA VERMELHA (BADGE) */}
        {!isOpen && unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: '#ff0000', color: 'white', fontSize: '12px',
            fontWeight: 'bold', width: '24px', height: '24px',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)', zIndex: 10000
          }}>
            {unreadCount}
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', bottom: '85px', right: 0, 
          width: '330px', height: '480px', background: 'white',
          borderRadius: '25px', display: 'flex', flexDirection: 'column', 
          boxShadow: '0 15px 40px rgba(0,0,0,0.2)', border: '1px solid #eee',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '15px 20px', background: '#22c55e', color: 'white' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>Chat Nova Tratores</h4>
            <span style={{ fontSize: '10px' }}>Suporte online</span>
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8f9fa' }}>
            {mensagens.map((m) => (
              <div key={m.id} style={{ 
                alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: '15px',
                background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : 'white',
                color: String(m.usuario_id) === String(userProfile.id) ? 'white' : '#333',
                fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                <b style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>{m.usuario_nome}</b>
                {m.texto}
              </div>
            ))}
          </div>

          <form onSubmit={enviarMensagem} style={{ padding: '15px', display: 'flex', gap: '8px', background: 'white', borderTop: '1px solid #eee' }}>
            <input 
              value={novaMsg} 
              onChange={(e) => setNovaMsg(e.target.value)} 
              placeholder="Digite..." 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }} 
            />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}