'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Paperclip, Eye, FileIcon, ImageIcon, Send, X, CheckCheck } from 'lucide-react'

export default function Chat({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef()

  useEffect(() => {
    if (isOpen) marcarTodasComoVistas()
  }, [isOpen, mensagens.length])

  const marcarTodasComoVistas = async () => {
    if (!isOpen || !userProfile?.id) return
    const msgsNaoVistas = (mensagens || []).filter(m => 
      m.usuario_id !== userProfile.id && 
      (!m.visualizado_por || !m.visualizado_por.includes(userProfile.id))
    )
    for (const msg of msgsNaoVistas) {
      const lista = [...(msg.visualizado_por || []), userProfile.id]
      await supabase.from('mensagens_chat').update({ visualizado_por: lista }).eq('id', msg.id)
    }
  }

  useEffect(() => {
    const channel = supabase.channel('chat_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, (p) => {
        if (p.eventType === 'INSERT' && !p.new.chamado_id) setMensagens(prev => [...(prev || []), p.new])
        if (p.eventType === 'UPDATE') setMensagens(prev => (prev || []).map(m => m.id === p.new.id ? p.new : m))
      }).subscribe()

    const load = async () => {
      const { data } = await supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true })
      setMensagens(data || [])
    }
    load()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen])

  const enviarMsg = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim() || !userProfile?.id) return
    const t = novaMsg; setNovaMsg('')
    const { error } = await supabase.from('mensagens_chat').insert([{
      texto: t,
      usuario_id: userProfile.id,
      usuario_nome: userProfile.nome,
      chamado_id: null,
      data_hora: new Date().toISOString() // SALVANDO NA COLUNA NOVA
    }])
    if (error) alert("Erro: " + error.message)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !userProfile?.id) return
    setUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      await supabase.storage.from('chat-midia').upload(fileName, file)
      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName)
      await supabase.from('mensagens_chat').insert([{
        texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo',
        midia_url: publicUrl,
        usuario_id: userProfile.id,
        usuario_nome: userProfile.nome,
        chamado_id: null,
        data_hora: new Date().toISOString()
      }])
    } catch (err) { alert(err.message) } finally { setUploading(false) }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '85px', right: 0, width: '350px', height: '500px', background: 'white', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '15px', background: '#0f172a', color: 'white', fontWeight: '900', fontSize: '12px' }}>CHAT GERAL NOVA</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
            {(mensagens || []).map(m => {
              const souEu = m.usuario_id === userProfile?.id
              const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
              return (
                <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ background: souEu ? '#0f172a' : 'white', color: souEu ? 'white' : '#1e293b', padding: '10px', borderRadius: '12px', border: souEu ? 'none' : '1px solid #e2e8f0' }}>
                    <b style={{ fontSize: '8px', display: 'block', opacity: 0.6 }}>{m.usuario_nome?.toUpperCase()}</b>
                    {m.midia_url && (
                        <div style={{marginBottom:'5px'}}>
                          {m.midia_url.match(/\.(jpeg|jpg|gif|png)$/) 
                            ? <img src={m.midia_url} style={{width:'100%', borderRadius:'8px'}} />
                            : <a href={m.midia_url} target="_blank" style={{fontSize:'10px', color: souEu ? '#38bdf8' : '#2563eb'}}>📁 Ver Arquivo</a>}
                        </div>
                    )}
                    <span style={{ fontSize: '13px' }}>{m.texto}</span>
                    <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.5, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                        {hora} {souEu && <CheckCheck size={12} color={(m.visualizado_por?.length > 1) ? "#38bdf8" : "#94a3b8"} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <form onSubmit={enviarMsg} style={{ padding: '10px', display: 'flex', gap: '8px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Paperclip size={20} color="#64748b" />
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
            <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder={uploading ? "Subindo..." : "Mensagem..."} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
            <button style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 15px' }}><Send size={16}/></button>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '65px', height: '65px', borderRadius: '50%', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isOpen ? <X size={28}/> : <MessageSquare size={28}/>}
      </button>
    </div>
  )
}