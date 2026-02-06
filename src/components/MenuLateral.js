'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, 
  UserCheck, LogOut, Menu, MessageSquare, X, Send, Paperclip, 
  FileText, Settings, Bell 
} from 'lucide-react'

export default function MenuLateral({ isSidebarOpen, setIsSidebarOpen, path, router, handleLogout, userProfile }) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef()
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(0)

  const rotaHome = userProfile?.funcao === 'Financeiro' ? '/home-financeiro' : '/home-posvendas';
  const rotaKanban = userProfile?.funcao === 'Financeiro' ? '/kanban-financeiro' : '/kanban-posvendas';

  // 1. CARREGAR HISTÓRICO (BUSCA TUDO QUE É GLOBAL)
  const loadMensagens = async () => {
    const { data, error } = await supabase
      .from('mensagens_chat')
      .select('*')
      .is('chamado_id', null) // Chat Global não tem chamado_id
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (!error) {
      setMensagens(data || []);
    }
  };

  // 2. ATIVAR REALTIME
  useEffect(() => {
    loadMensagens();

    const channelChat = supabase.channel('global_chat_sidebar')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        (payload) => {
          // Filtra se a nova mensagem é global
          if (!payload.new.chamado_id) {
            setMensagens(prev => {
              const jaExiste = prev.find(m => m.id === payload.new.id);
              if (jaExiste) return prev;
              return [...prev, payload.new];
            });
            if (!isChatOpen) setNotificacoesAtivas(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelChat); };
  }, [isChatOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && isChatOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, isChatOpen]);

  // 3. ENVIAR MENSAGEM (CORRIGIDO PARA PERSISTIR)
  const enviarMsg = async (e) => {
    e.preventDefault();
    if (!novaMsg.trim() || !userProfile?.id) return;
    
    const textoParaEnvio = novaMsg;
    setNovaMsg('');

    const { error } = await supabase.from('mensagens_chat').insert([{
      texto: textoParaEnvio,
      usuario_nome: userProfile.nome || 'Usuário',
      usuario_id: userProfile.id,
      chamado_id: null, // Garante que é global
      pagar_id: null,
      receber_id: null,
      rh_id: null,
      data_hora: new Date().toISOString()
    }]);

    if (error) alert("Erro ao salvar no banco: " + error.message);
  };

  // 4. UPLOAD DE ARQUIVOS
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userProfile?.id) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('chat-midia').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName);

      await supabase.from('mensagens_chat').insert([{
        texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo',
        midia_url: publicUrl,
        usuario_id: userProfile.id,
        usuario_nome: userProfile.nome,
        chamado_id: null,
        data_hora: new Date().toISOString()
      }]);
    } catch (err) { alert("Erro upload: " + err.message); } finally { setUploading(false); }
  };

  // ESTILO DINÂMICO PARA ABA ATIVA (FUNDO PRETO, FONTE BRANCA)
  const getBtnStyle = (route) => {
    const isActive = path === route;
    return {
      background: isActive ? '#000' : 'none',
      color: isActive ? '#fff' : '#000',
      border: 'none',
      padding: '18px 0',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '400',
      display: 'flex',
      alignItems: 'center',
      width: isSidebarOpen ? 'calc(100% - 30px)' : '100%',
      margin: isSidebarOpen ? '4px 15px' : '4px 0',
      borderRadius: isSidebarOpen ? '12px' : '0px',
      transition: '0.3s ease',
    };
  };

  const iconContainer = { minWidth: '85px', display: 'flex', justifyContent: 'center', alignItems: 'center' };

  return (
    <>
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)} 
        onMouseLeave={() => setIsSidebarOpen(false)} 
        style={{ 
          width: isSidebarOpen ? '320px' : '85px', 
          background: '#fff', 
          height: '100vh', position: 'fixed', left: 0, top: 0, 
          borderRight: '1px solid #e2e8f0', padding: '30px 0', 
          display: 'flex', flexDirection: 'column', transition: '0.4s ease', zIndex: 1100, overflow: 'hidden' 
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
            {isSidebarOpen ? <b style={{ fontSize: '22px', letterSpacing: '3px', color: '#000' }}>NOVA</b> : <Menu size={32} color="#000" />}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => router.push(rotaHome)} style={getBtnStyle(rotaHome)}>
              <div style={iconContainer}><LayoutDashboard size={24} /></div>
              <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>TAREFAS</span>
            </button>

            <button onClick={() => router.push(rotaKanban)} style={getBtnStyle(rotaKanban)}>
              <div style={iconContainer}><ClipboardList size={24} /></div>
              <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>BOLETOS</span>
            </button>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '20px 0' }}></div>

            <button onClick={() => router.push('/historico-pagar')} style={getBtnStyle('/historico-pagar')}>
              <div style={iconContainer}><TrendingDown size={24} /></div>
              <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>HISTÓRICO PAGAR</span>
            </button>

            <button onClick={() => router.push('/historico-receber')} style={getBtnStyle('/historico-receber')}>
              <div style={iconContainer}><TrendingUp size={24} /></div>
              <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>HISTÓRICO RECEBER</span>
            </button>

            <button onClick={() => router.push('/historico-rh')} style={getBtnStyle('/historico-rh')}>
              <div style={iconContainer}><UserCheck size={24} /></div>
              <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>HISTÓRICO RH</span>
            </button>
          </nav>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <button onClick={() => router.push('/configuracoes')} style={getStyleConfigSair(path === '/configuracoes')}>
            <div style={iconContainer}><Settings size={24} /></div>
            <span style={{ opacity: isSidebarOpen ? 1 : 0 }}>CONFIGURAÇÕES</span>
          </button>

          <button onClick={() => { setIsChatOpen(true); setNotificacoesAtivas(0); }} style={getBtnStyle('chat')}>
            <div style={{ ...iconContainer, position: 'relative' }}>
              <MessageSquare size={24} />
              {notificacoesAtivas > 0 && (
                <div style={{ position: 'absolute', top: '10px', right: '25px', width: '10px', height: '10px', background: 'red', borderRadius: '50%', border: '2px solid #fff' }}></div>
              )}
            </div>
            <span style={{ opacity: isSidebarOpen ? 1 : 0, whiteSpace: 'nowrap' }}>CHAT GERAL</span>
          </button>

          <button onClick={handleLogout} style={{ ...getBtnStyle('sair'), color: '#ef4444' }}>
            <div style={iconContainer}><LogOut size={24} /></div>
            <span style={{ opacity: isSidebarOpen ? 1 : 0 }}>SAIR</span>
          </button>
        </div>
      </aside>

      {/* --- CHAT CENTRALIZADO COM BACKDROP --- */}
      {isChatOpen && (
        <div 
          onClick={() => setIsChatOpen(false)} // Fecha ao clicar fora
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', 
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: 2000, animation: 'fadeIn 0.3s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Não fecha ao clicar dentro
            style={{ 
              width: '500px', height: '80vh', background: '#fff', 
              borderRadius: '35px', boxShadow: '0 40px 80px rgba(0,0,0,0.3)', 
              display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '25px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '18px', fontWeight: '400' }}>COMUNICAÇÃO INTERNA</b>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={28} />
              </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#f8fafc' }}>
              {mensagens.map(m => (
                <div key={m.id} style={{ alignSelf: m.usuario_id === userProfile?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ 
                    background: m.usuario_id === userProfile?.id ? '#0f172a' : '#fff', 
                    color: m.usuario_id === userProfile?.id ? '#fff' : '#000', 
                    padding: '15px 20px', borderRadius: '20px', border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginBottom: '5px' }}>
                      <small style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>{m.usuario_nome?.toUpperCase()}</small>
                      <small style={{ fontSize: '9px', opacity: 0.4 }}>
                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </small>
                    </div>
                    {m.midia_url && (
                      <div style={{ marginBottom: '10px' }}>
                        {m.midia_url.match(/\.(jpeg|jpg|gif|png)$/) 
                          ? <img src={m.midia_url} style={{ width: '100%', borderRadius: '15px' }} onClick={() => window.open(m.midia_url)} />
                          : <a href={m.midia_url} target="_blank" style={{ fontSize: '12px', color: '#38bdf8', display:'flex', alignItems:'center', gap:'5px', textDecoration:'none' }}>
                              <FileText size={18}/> Ver Documento
                            </a>}
                      </div>
                    )}
                    <div style={{ fontSize: '15px', lineHeight: '1.6' }}>{m.texto}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={enviarMsg} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop: '1px solid #eee', alignItems: 'center', background: '#fff' }}>
              <label style={{ cursor: 'pointer', padding: '12px', background: '#f1f5f9', borderRadius: '50%', display: 'flex' }}>
                <Paperclip size={24} color="#64748b" />
                <input type="file" hidden onChange={handleUpload} disabled={uploading} />
              </label>
              <input 
                value={novaMsg} 
                onChange={e => setNovaMsg(e.target.value)} 
                placeholder={uploading ? "Subindo..." : "Escreva uma mensagem..."} 
                style={{ flex: 1, padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px', background: '#f8fafc' }} 
              />
              <button type="submit" disabled={!novaMsg.trim()} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '20px', width: '55px', height:'55px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <Send size={24} />
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  )
}

// Estilo extra para Configurações e Sair no rodapé para seguir o padrão de destaque
function getStyleConfigSair(isActive) {
    return {
        background: isActive ? '#000' : 'none',
        color: isActive ? '#fff' : '#000',
        border: 'none', padding: '16px 0', cursor: 'pointer', fontSize: '15px', fontWeight: '400', display: 'flex', alignItems: 'center', width: '100%', transition: '0.3s ease'
    }
}