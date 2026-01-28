'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  // 1. Escutar mensagens em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          // AJUSTE: Só adiciona se a mensagem já não estiver na lista (evita duplicidade do update otimista)
          setMensagens((prev) => {
            const jaExiste = prev.find(m => m.id === payload.new.id)
            if (jaExiste) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    // Carregar histórico inicial
    const carregarHistorico = async () => {
      const { data } = await supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      if (data) setMensagens(data)
    }
    carregarHistorico()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens, isOpen])

  // LÓGICA DE ENVIO OTIMISTA INTEGRADA
  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    // Cria um objeto temporário para a tela
    const msgTemporaria = { 
      texto: novaMsg, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id,
      id: Math.random() // id provisório para o map do React
    }

    // Adiciona na tela na hora (Update Otimista)
    setMensagens(prev => [...prev, msgTemporaria])
    
    // Guarda o texto e limpa o campo imediatamente
    const textoParaEnviar = novaMsg
    setNovaMsg('')

    // Envia para o banco no fundo
    const { error } = await supabase.from('mensagens_chat').insert([{ 
      texto: textoParaEnviar, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id 
    }])

    // Se der erro, você pode remover a mensagem temporária ou avisar o usuário
    if (error) {
        console.error("Erro ao enviar:", error)
        setMensagens(prev => prev.filter(m => m.id !== msgTemporaria.id))
        alert("Erro ao enviar mensagem. Tente novamente.")
    }
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      {/* BOTÃO FLUTUANTE */}
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)' }}>
        {isOpen ? '✕' : '💬'}
      </button>

      {/* JANELA DE CHAT */}
      {isOpen && (
        <div style={{ ...glassStyle, position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '450px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.1)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#14532d' }}>Dúvidas Nova Tratores</h4>
            <span style={{ fontSize: '10px', color: '#22c55e' }}>● Online agora</span>
          </div>

          {/* LISTA DE MENSAGENS */}
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mensagens.map((m) => (
              <div key={m.id} style={{ 
                alignSelf: m.usuario_id === userProfile.id ? 'flex-end' : 'flex-start',
                maxWidth: '80%', padding: '10px 15px', borderRadius: '15px',
                background: m.usuario_id === userProfile.id ? '#22c55e' : 'white',
                color: m.usuario_id === userProfile.id ? 'white' : 'black',
                fontSize: '12px'
              }}>
                <p style={{ margin: 0, fontSize: '9px', opacity: 0.7, fontWeight: 'bold' }}>{m.usuario_nome}</p>
                <p style={{ margin: 0 }}>{m.texto}</p>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <form onSubmit={enviarMensagem} style={{ padding: '15px', display: 'flex', gap: '10px' }}>
            <input 
                value={novaMsg} 
                onChange={(e) => setNovaMsg(e.target.value)} 
                placeholder="Digite sua dúvida..." 
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', fontSize: '12px' }} 
            />
            <button style={{ background: '#14532d', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}