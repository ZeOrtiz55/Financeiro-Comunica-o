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
  const meuIdRef = useRef(String(userProfile?.id || '').trim())

  // Sincroniza o ID do usuário com a Ref
  useEffect(() => {
    meuIdRef.current = String(userProfile?.id || '').trim()
  }, [userProfile])

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notificacao.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch (err) { console.log(err) }
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          const msgRecebida = payload.new
          const meuId = meuIdRef.current
          const idRemetente = String(msgRecebida.usuario_id || '').trim()

          console.log(`[Chat] Chegou msg de: ${idRemetente} | Eu sou: ${meuId}`)

          setMensagens((prev) => {
            // REGRA 1: Se o ID da mensagem já existe na lista, ignora (evita duplicidade real)
            const jaExiste = prev.find(m => m.id === msgRecebida.id)
            if (jaExiste) return prev

            // REGRA 2: Se a mensagem é MINHA, eu ignoro o Realtime
            // porque eu já adicionei ela na tela via enviarMensagem()
            if (idRemetente === meuId && meuId !== "") {
              console.log("[Chat] Ignorando mensagem do Realtime porque fui eu que enviei.")
              return prev
            }
            
            console.log("[Chat] Adicionando nova mensagem de terceiro.")
            return [...prev, msgRecebida]
          })

          // Notificação e Som
          if (idRemetente !== meuId) {
            playNotificationSound()
            if (!isOpenRef.current) setUnreadCount(prev => prev + 1)
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
  }, []) // Dependency array vazio para não criar múltiplas conexões

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens, isOpen])

  const enviarMensagem = async (e) => {
    e.preventDefault()
    const textoParaEnviar = novaMsg.trim()
    if (!textoParaEnviar) return
    setNovaMsg('')

    // Update Otimista: Adiciona na tela com um ID temporário
    const msgOtimista = { 
      texto: textoParaEnviar, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id,
      id: `temp-${Date.now()}` // ID temporário fácil de identificar
    }
    
    setMensagens(prev => [...prev, msgOtimista])

    // Envia para o banco
    const { error } = await supabase.from('mensagens_chat').insert([{ 
      texto: textoParaEnviar, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])

    if (error) {
      alert("Erro ao enviar")
      setMensagens(prev => prev.filter(m => m.id !== msgOtimista.id))
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{ width: '65px', height: '65px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '28px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {isOpen ? '✕' : '💬'}
        </button>

        {!isOpen && unreadCount > 0 && (
          <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff0000', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10000 }}>
            {unreadCount}
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', bottom: '85px', right: 0, width: '330px', height: '480px', background: 'white', borderRadius: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 40px rgba(0,0,0,0.2)', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', background: '#22c55e', color: 'white' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>Chat Nova Tratores</h4>
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8f9fa' }}>
            {mensagens.map((m) => {
               const ehMinha = String(m.usuario_id).trim() === String(userProfile?.id).trim()
               return (
                <div key={m.id} style={{ 
                  alignSelf: ehMinha ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', padding: '10px 14px', borderRadius: '15px',
                  background: ehMinha ? '#22c55e' : 'white',
                  color: ehMinha ? 'white' : '#333',
                  fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  <b style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>{m.usuario_nome}</b>
                  {m.texto}
                </div>
               )
            })}
          </div>

          <form onSubmit={enviarMensagem} style={{ padding: '15px', display: 'flex', gap: '8px', background: 'white', borderTop: '1px solid #eee' }}>
            <input value={novaMsg} onChange={(e) => setNovaMsg(e.target.value)} placeholder="Digite..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }} />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}