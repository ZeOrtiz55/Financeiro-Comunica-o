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

  // Sincroniza a Ref com o estado aberto/fechado
  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const playNotificationSound = () => {
    const audio = new Audio('/notificacao.mp3') // Certifique se o nome está idêntico na pasta public
    audio.volume = 0.5
    audio.play().catch(e => console.warn("Bloqueio de áudio do navegador: Clique na tela primeiro!"))
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          const msgDB = payload.new
          
          // CONVERSÃO FORÇADA PARA EVITAR ERRO DE TIPO (Número vs Texto)
          const meuId = String(userProfile?.id || '').trim()
          const remetenteId = String(msgDB.usuario_id || '').trim()

          console.log(`[DEBUG] Msg de: ${remetenteId} | Meu ID: ${meuId}`)

          setMensagens((prev) => {
            // Se eu já tenho essa mensagem (pelo ID real do banco), ignoro
            if (prev.find(m => m.id === msgDB.id)) return prev
            
            // Se a mensagem que chegou no Realtime tem o MEU ID, eu ignoro
            // porque ela já foi adicionada na tela pelo 'enviarMensagem'
            if (remetenteId === meuId) return prev
            
            // SE CHEGOU AQUI, A MENSAGEM É DE OUTRA PESSOA
            if (!isOpenRef.current) {
               setUnreadCount(c => c + 1)
            }
            playNotificationSound()
            
            return [...prev, msgDB]
          })
        }
      )
      .subscribe()

    const carregar = async () => {
      const { data } = await supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      if (data) setMensagens(data)
    }
    carregar()

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens, isOpen])

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    const texto = novaMsg
    setNovaMsg('')

    // ID temporário para o Update Otimista
    const tempId = Date.now()
    setMensagens(prev => [...prev, { 
        id: tempId, 
        texto, 
        usuario_nome: userProfile.nome, 
        usuario_id: userProfile.id 
    }])

    const { error } = await supabase.from('mensagens_chat').insert([{ 
      texto, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])

    if (error) {
        alert("Erro ao enviar")
        setMensagens(prev => prev.filter(m => m.id !== tempId))
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      
      {/* BOTÃO */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{ width: '65px', height: '65px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '28px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {isOpen ? '✕' : '💬'}
        </button>

        {/* BOLINHA VERMELHA - POSIÇÃO FORÇADA */}
        {!isOpen && unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: 'red', color: 'white', fontSize: '12px',
            fontWeight: 'bold', width: '25px', height: '25px',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '2px solid white', zIndex: 10000
          }}>
            {unreadCount}
          </div>
        )}
      </div>

      {/* JANELA */}
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '85px', right: 0, width: '320px', height: '450px', background: 'white', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 30px rgba(0,0,0,0.2)', overflow: 'hidden', border: '1px solid #eee' }}>
          <div style={{ padding: '15px', background: '#22c55e', color: 'white', fontWeight: 'bold' }}>Chat Online</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9f9f9' }}>
            {mensagens.map(m => {
                const souEu = String(m.usuario_id) === String(userProfile?.id)
                return (
                    <div key={m.id} style={{ 
                        alignSelf: souEu ? 'flex-end' : 'flex-start',
                        background: souEu ? '#22c55e' : '#e5e7eb',
                        color: souEu ? 'white' : 'black',
                        padding: '8px 12px', borderRadius: '12px', fontSize: '13px', maxWidth: '80%'
                    }}>
                        <b style={{fontSize:'9px', display:'block'}}>{m.usuario_nome}</b>
                        {m.texto}
                    </div>
                )
            })}
          </div>
          <form onSubmit={enviarMensagem} style={{ padding: '10px', display: 'flex', gap: '5px' }}>
            <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Sua dúvida..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '8px' }} />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}