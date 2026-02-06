'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Paperclip, Eye, FileIcon, ImageIcon, Send, X, CheckCheck, MessageSquare } from 'lucide-react'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef()

  // 1. CARREGAR MENSAGENS E ATIVAR REALTIME
  useEffect(() => {
    // Se não tiver perfil, não faz nada para não dar erro
    if (!userProfile?.id) return

    const loadMensagens = async () => {
      const { data, error } = await supabase
        .from('mensagens_chat')
        .select('*')
        .is('chamado_id', null) // Apenas chat global
        .order('created_at', { ascending: true })
        .limit(100)
      
      if (!error) setMensagens(data || [])
    }

    loadMensagens()

    // ESCUTA TUDO E FILTRA NO CLIENTE (MAIS SEGURO)
    const channel = supabase.channel('chat_global_room')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens_chat'
      }, (payload) => {
        // Só adiciona se for chat global (chamado_id nulo)
        if (!payload.new.chamado_id) {
          setMensagens(prev => {
            // Verifica se a mensagem já não está lá (evita duplicar com o optimistic update)
            const existe = prev.find(m => m.id === payload.new.id || (m.texto === payload.new.texto && m.tempId));
            if (existe) return prev;
            return [...prev, payload.new];
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'mensagens_chat' 
      }, (payload) => {
        setMensagens(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile?.id])

  // 2. AUTO-SCROLL SEMPRE QUE A MENSAGEM MUDA
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, isOpen])

  // 3. ENVIAR MENSAGEM
  const enviarMsg = async (e) => {
    e.preventDefault() 
    if (!novaMsg.trim() || !userProfile?.id) return

    const textoEnvio = novaMsg
    setNovaMsg('') // Limpa o campo na hora para dar sensação de velocidade

    // MENSAGEM OTIMISTA (Aparece na tela antes de ir pro banco)
    const msgOtimista = {
      id: Math.random(), // id temporário
      tempId: true,
      texto: textoEnvio,
      usuario_id: userProfile.id,
      usuario_nome: userProfile.nome,
      data_hora: new Date().toISOString(),
      visualizado_por: [userProfile.id]
    }
    
    setMensagens(prev => [...prev, msgOtimista])

    const { error } = await supabase.from('mensagens_chat').insert([{
      texto: textoEnvio,
      usuario_id: userProfile.id,
      usuario_nome: userProfile.nome,
      chamado_id: null,
      data_hora: new Date().toISOString(),
      visualizado_por: [userProfile.id]
    }])

    if (error) {
      console.error("Erro ao enviar:", error)
      // Se deu erro, remove a mensagem otimista da tela
      setMensagens(prev => prev.filter(m => m.id !== msgOtimista.id))
      alert("Falha ao enviar mensagem.")
    }
  }

  // 4. UPLOAD DE ARQUIVOS
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !userProfile?.id) return
    
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('chat-midia')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName)

      await supabase.from('mensagens_chat').insert([{
        texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo',
        midia_url: publicUrl,
        usuario_id: userProfile.id,
        usuario_nome: userProfile.nome,
        chamado_id: null,
        data_hora: new Date().toISOString(),
        visualizado_por: [userProfile.id]
      }])
    } catch (err) {
      alert("Erro no upload: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, fontFamily: 'Montserrat' }}>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '85px', right: 0, width: '380px', height: '550px', background: 'white', borderRadius: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          
          <div style={{ padding: '20px', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '900', fontSize: '13px', letterSpacing: '1px' }}>CHAT GERAL NOVA</span>
            <X size={20} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer', opacity: 0.7 }} />
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
            {mensagens.map(m => {
              const souEu = m.usuario_id === userProfile?.id
              const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
              return (
                <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ 
                    background: souEu ? '#0f172a' : 'white', 
                    color: souEu ? 'white' : '#1e293b', 
                    padding: '12px 16px', 
                    borderRadius: souEu ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    border: souEu ? 'none' : '1px solid #e2e8f0'
                  }}>
                    {!souEu && <b style={{ fontSize: '9px', display: 'block', opacity: 0.5, marginBottom: '4px', textTransform: 'uppercase' }}>{m.usuario_nome}</b>}
                    
                    {m.midia_url && (
                      <div style={{ marginBottom: '8px' }}>
                        {m.midia_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) 
                          ? <img src={m.midia_url} alt="imagem" style={{ width: '100%', borderRadius: '10px', cursor: 'pointer' }} onClick={() => window.open(m.midia_url)} />
                          : <a href={m.midia_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: souEu ? '#38bdf8' : '#2563eb', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '8px' }}>
                              <FileIcon size={16} /> Ver Documento
                            </a>
                        }
                      </div>
                    )}

                    <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{m.texto}</span>
                    
                    <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.5, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      {hora}
                      {souEu && <CheckCheck size={14} color={m.visualizado_por?.length > 1 ? "#38bdf8" : "#94a3b8"} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={enviarMsg} style={{ padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', background: 'white', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', padding: '8px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paperclip size={20} color="#64748b" />
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
            
            <input 
              value={novaMsg} 
              onChange={e => setNovaMsg(e.target.value)} 
              placeholder={uploading ? "Enviando..." : "Digite uma mensagem..."} 
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '15px', padding: '12px 15px', fontSize: '14px', outline: 'none', background: '#f8fafc' }} 
            />
            
            <button type="submit" style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '15px', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ width: '70px', height: '70px', borderRadius: '22px', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isOpen ? <X size={32}/> : <MessageSquare size={32}/>}
      </button>
    </div>
  )
}