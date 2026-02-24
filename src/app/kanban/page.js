'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES COMPLETOS
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle, Tag, Lock, DollarSign
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#212124', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#f8fafc', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
      Sincronizando Kanban <br /> <span style={{ fontSize: '32px', fontWeight:'400', color: '#9e9e9e' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA PT-BR ---
const formatarDataBR = (dataStr) => {
 if (!dataStr || dataStr === 'null' || dataStr === "") return 'N/A';
 try {
  const apenasData = dataStr.split(' ')[0];
  const partes = apenasData.split(/[-/]/);
  if (partes.length === 3) {
   if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`; 
   return `${partes[0]}/${partes[1]}/${partes[2]}`;
  }
  return dataStr;
 } catch (e) { return dataStr; }
};

function GeometricBackground() {
 return (
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#2a2a2d', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(42, 42, 45, 0.4) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const colunaId = tipo === 'boleto' ? 'chamado_id' : tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'rh_id';
 
 useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  const cleanId = String(registroId).includes('_p') ? registroId.split('_p')[0] : registroId;
  supabase.from('mensagens_chat').select('*').eq(colunaId, cleanId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_fin_k_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaId}=eq.${cleanId}` }, payload => { 
   if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
 }, [registroId, userProfile?.id, tipo, colunaId]);

 const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  const cleanId = String(registroId).includes('_p') ? registroId.split('_p')[0] : registroId;
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  const insertData = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }; insertData[colunaId] = cleanId;
  await supabase.from('mensagens_chat').insert([insertData]);
 }

 return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #55555a', borderRadius: '24px', overflow: 'hidden', background: '#242427', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
   <div style={{ padding: '18px 25px', background: '#3f3f44', borderBottom: '1px solid #55555a', fontSize: '13px', color: '#9e9e9e', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#3b82f625' : '#3f3f44', color: '#fff', padding: '14px 18px', borderRadius: '18px', maxWidth: '85%', border: '1px solid #55555a' }}>
      <span style={{ fontSize: '9px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>{m.usuario_nome}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#3f3f44', display: 'flex', gap: '12px' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #55555a', background: '#2a2a2d', color: '#fff', outline: 'none', fontSize: '16px' }} />
     <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '14px', width: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={20} /></button>
   </form>
  </div>
 )
}

// --- 4. COMPONENTE KANBAN PRINCIPAL ---
export default function Kanban() {
 const [chamados, setChamados] = useState([]); const [userProfile, setUserProfile] = useState(null);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null); const [loading, setLoading] = useState(true);
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 
 const [filtroCliente, setFiltroCliente] = useState('');
 const [filtroNF, setFiltroNF] = useState('');
 const [filtroData, setFiltroData] = useState('');

 const [fileBoleto, setFileBoleto] = useState(null);
 const router = useRouter();

 const colunas = [
  { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
  { id: 'enviar_cliente', titulo: 'ENVIAR PARA CLIENTE' },
  { id: 'aguardando_vencimento', titulo: 'AGUARDANDO VENCIMENTO' },
  { id: 'pago', titulo: 'PAGO' },
  { id: 'vencido', titulo: 'VENCIDO' }
 ];

 const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) { console.error(e); }
 };

 const carregarDados = async () => {
  try {
    const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    
    const processados = (data || []).map(c => {
      let st = c.status || 'gerar_boleto';
      const venc = c.vencimento_boleto ? new Date(c.vencimento_boleto) : null;
      if (venc) venc.setHours(0,0,0,0);
      
      if (st === 'aguardando_vencimento' && venc && venc < hoje) st = 'vencido';

      const temComprovante = c.comprovante_pagamento || c.comprovante_pagamento_p1 || c.comprovante_pagamento_p2 || c.comprovante_pagamento_p3 || c.comprovante_pagamento_p4 || c.comprovante_pagamento_p5;

      return { 
        ...c, 
        status: st, 
        valor_exibicao: c.valor_servico,
        isPagamentoRealizado: !!temComprovante
      };
    });
    setChamados(processados);
  } catch (err) { console.error(err); }
 }

 useEffect(() => {
  const init = async () => {
   try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) return router.push('/login');
    const { data: prof, error: profError } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
    if (!profError) setUserProfile(prof);
    await carregarDados();
   } catch (e) { console.error(e); }
   finally { setLoading(false); }
  }; init();
 }, [router]);

 const handleUpdateField = async (id, field, value) => {
    await supabase.from('Chamado_NF').update({ [field]: value }).eq('id', id);
    carregarDados();
    if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: value }));
 };

 const handleUpdateFileDirect = async (id, field, file) => {
    if(!file) return;
    try {
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      await supabase.from('Chamado_NF').update({ [field]: linkData.publicUrl }).eq('id', id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleConfirmarEnvioPV = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'aguardando_vencimento', tarefa: 'Aguardando Vencimento' }).eq('id', t.id);
    alert("Card movido para Aguardando Vencimento!");
    setTarefaSelecionada(null);
    carregarDados();
 };

 const chamadosFiltrados = chamados.filter(c => {
    const matchCliente = c.nom_cliente?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchNF = (c.num_nf_servico?.toString().includes(filtroNF) || c.num_nf_peca?.toString().includes(filtroNF));
    const matchData = filtroData ? c.vencimento_boleto === filtroData : true;
    return matchCliente && matchNF && matchData;
 });

 if (loading) return <LoadingScreen />

 // LÓGICAS CONDICIONAIS PARA INTERFACE
 const isBoleto30 = tarefaSelecionada?.forma_pagamento === 'Boleto 30 dias';
 const isParcelamentoOuBoleto30 = tarefaSelecionada && ['Boleto 30 dias', 'Boleto Parcelado', 'Cartão Parcelado'].includes(tarefaSelecionada.forma_pagamento);
 const isPixOuCartaoVista = tarefaSelecionada && ['Á Vista no Pix', 'Cartão a Vista'].includes(tarefaSelecionada.forma_pagamento);
 const valorIndividual = tarefaSelecionada ? (tarefaSelecionada.valor_servico / (tarefaSelecionada.qtd_parcelas || 1)).toFixed(2) : 0;

 return (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Montserrat, sans-serif', background: '#2a2a2d', overflow: 'hidden' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/kanban" router={router} handleLogout={handleLogout} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, display: 'flex', flexDirection: 'column', transition: '0.4s ease', height: '100vh', overflow: 'hidden' }}>
    <header style={{ padding: '50px 50px 30px 50px' }}>
     <h1 style={{ fontWeight: '300', fontSize:'52px', color:'#f8fafc', letterSpacing:'-2px', marginBottom: '30px' }}>Fluxo Financeiro</h1>
     
     <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', justifyContent: 'flex-start' }}>
        <div style={{ position: 'relative', width: '350px' }}>
            <Search size={20} style={iconFilterStyle} />
            <input type="text" placeholder="Filtrar Cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={inputFilterStyle} />
        </div>
        <div style={{ position: 'relative', width: '200px' }}>
            <Hash size={20} style={iconFilterStyle} />
            <input type="text" placeholder="Nº Nota..." value={filtroNF} onChange={e => setFiltroNF(e.target.value)} style={inputFilterStyle} />
        </div>
        <div style={{ position: 'relative', width: '220px' }}>
            <Calendar size={20} style={iconFilterStyle} />
            <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={inputFilterStyle} />
            {filtroData && <X size={16} onClick={() => setFiltroData('')} style={{position:'absolute', right: '15px', top: '50%', transform:'translateY(-50%)', cursor:'pointer', color:'#fca5a5'}}/>}
        </div>
     </div>
    </header>

    <div style={{ flex: 1, display: 'flex', gap: '25px', overflowX: 'auto', overflowY: 'hidden', padding: '0 50px 40px 50px', boxSizing: 'border-box' }}>
     {colunas.map(col => (
      <div key={col.id} style={{ minWidth: '420px', flex: 1, display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ background: '#313134', color: '#9e9e9e', padding: '20px', borderRadius: '16px', marginBottom: '25px', textAlign: 'center', fontWeight:'400', fontSize:'16px', letterSpacing:'1px', border: '1px solid #55555a', flexShrink: 0 }}>{col.titulo}</h3>
       
       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '5px' }}>
        {chamadosFiltrados.filter(c => {
           if(col.id === 'gerar_boleto') return c.status === 'gerar_boleto' || c.status === 'validar_pix';
           return c.status === col.id;
        }).map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="kanban-card">
          <div style={{ background: t.status === 'vencido' ? '#fca5a520' : (t.status === 'pago' ? '#4ade8020' : '#313134'), padding: '25px', color: '#fff', borderBottom: '1px solid #55555a' }}>
           <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '400', color: t.status === 'vencido' ? '#fca5a5' : (t.status === 'pago' ? '#4ade80' : '#fff') }}>{t.nom_cliente?.toUpperCase()}</h4>
           {t.isPagamentoRealizado && (
             <div style={{ marginTop: '12px', display:'flex', alignItems:'center', gap:'6px', color:'#4ade80', fontSize:'11px', fontWeight:'600', letterSpacing:'1px' }}>
               <CheckCircle size={14}/> PAGAMENTO REALIZADO
             </div>
           )}
          </div>
          <div style={{ padding: '25px', background:'#4e4e52' }}>
           <div style={cardInfoStyle}><CreditCard size={16}/> <span>FORMA:</span> {t.forma_pagamento?.toUpperCase()}</div>
           <div style={cardInfoStyle}><Calendar size={16}/> <span>VENC:</span> {formatarDataBR(t.vencimento_boleto)}</div>
           <div style={{fontSize:'32px', fontWeight:'400', margin:'15px 0', color:'#fff'}}>R$ {t.valor_exibicao}</div>
           <div style={miniTagStyle}>ID: {t.id}</div>
          </div>
         </div>
        ))}
       </div>
      </div>
     ))}
    </div>
   </main>

   {/* --- MODAL DETALHES --- */}
   {tarefaSelecionada && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#3f3f44', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.6)', border: '1px solid #55555a' }}>
      
      <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
        <h2 style={{fontSize:'32px', fontWeight:'400', margin:'25px 0', letterSpacing:'-1px', color:'#fff', lineHeight: '1'}}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelModalStyle}>Condição</label><p style={pModalStyle}>{tarefaSelecionada.forma_pagamento?.toUpperCase()}</p></div>
          
          <div style={fieldBoxModal}>
            <label style={labelModalStyle}>Valor Total</label>
            <input 
              type="number" 
              style={{ ...inputStyleModal, border: 'none', background: 'transparent', padding: '0', fontSize: '36px' }} 
              defaultValue={tarefaSelecionada.valor_servico} 
              onBlur={e => handleUpdateField(tarefaSelecionada.id, 'valor_servico', e.target.value)} 
            />
          </div>

          {isBoleto30 && (
            <div style={fieldBoxModal}>
              <label style={labelModalStyle}>Vencimento</label>
              <input 
                type="date" 
                style={{ ...inputStyleModal, border: 'none', background: 'transparent', padding: '0', fontSize: '36px', color: tarefaSelecionada.status === 'vencido' ? '#fca5a5' : '#fff' }} 
                defaultValue={tarefaSelecionada.vencimento_boleto} 
                onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)} 
              />
            </div>
          )}
        </div>

        {/* PARCELAMENTO EM CASCATA (ESCONDIDO PARA BOLETO 30 DIAS) */}
        {!isBoleto30 && isParcelamentoOuBoleto30 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#2a2a2d', padding:'40px', borderRadius:'30px', border:'1px solid #55555a', marginBottom: '45px' }}>
             <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #55555a', paddingBottom:'20px', marginBottom:'10px' }}>
                <div style={{ display:'flex', gap:'40px' }}>
                  <div>
                    <label style={labelModalStyle}>Quantidade</label>
                    <select 
                      style={{ ...inputStyleModal, width: '180px', padding: '10px' }}
                      value={tarefaSelecionada.qtd_parcelas || 1}
                      onChange={e => handleUpdateField(tarefaSelecionada.id, 'qtd_parcelas', e.target.value)}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelModalStyle}>Cálculo Unitário</label>
                    <p style={{ ...pModalStyle, fontSize: '24px', opacity: 0.7 }}>R$ {valorIndividual}</p>
                  </div>
                </div>
             </div>

             <div style={{ display:'flex', flexDirection:'column', gap: '15px' }}>
                <div style={cascadeRowStyle}>
                  <span style={cascadeLabelStyle}>1ª PARCELA</span>
                  <input type="date" style={inputCascadeStyle} defaultValue={tarefaSelecionada.vencimento_boleto} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)} />
                  <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                  <AttachmentTag label="COMPROVANTE P1" fileUrl={tarefaSelecionada.comprovante_pagamento} onUpload={f => handleUpdateFileDirect(tarefaSelecionada.id, 'comprovante_pagamento', f)} />
                </div>
                
                {Array.from({ length: (tarefaSelecionada.qtd_parcelas || 1) - 1 }).map((_, i) => {
                  const pNum = i + 2;
                  const currentDates = (tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/);
                  return (
                    <div key={pNum} style={cascadeRowStyle}>
                      <span style={cascadeLabelStyle}>{pNum}ª PARCELA</span>
                      <input 
                        type="date" 
                        style={inputCascadeStyle} 
                        defaultValue={currentDates[i] || ""} 
                        onBlur={e => {
                          let arr = [...currentDates];
                          arr[i] = e.target.value;
                          handleUpdateField(tarefaSelecionada.id, 'datas_parcelas', arr.filter(d => d).join(', '));
                        }} 
                      />
                      <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                      <AttachmentTag label={`COMPROVANTE P${pNum}`} fileUrl={tarefaSelecionada[`comprovante_pagamento_p${pNum}`]} onUpload={f => handleUpdateFileDirect(tarefaSelecionada.id, `comprovante_pagamento_p${pNum}`, f)} />
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px', background:'#2a2a2d', padding:'45px', borderRadius:'30px', border:'1px solid #55555a' }}>
          <div style={fieldBoxInner}><label style={labelModalStyle}>Nota de Serviço</label><input style={inputStyleModal} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_servico', e.target.value)} /></div>
          <div style={fieldBoxInner}><label style={labelModalStyle}>Nota de Peça</label><input style={inputStyleModal} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_peca', e.target.value)} /></div>
          <div style={{gridColumn:'span 2', ...fieldBoxInner}}><label style={labelModalStyle}>Observações Financeiras</label><textarea style={{...inputStyleModal, height:'130px', resize: 'none'}} defaultValue={tarefaSelecionada.obs} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'obs', e.target.value)} /></div>
        </div>

        <div style={{marginTop:'40px'}}>
            <label style={labelModalStyle}>Documentação Base</label>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_peca', file)} />
                <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_servico', file)} />
                <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_boleto', file)} />
            </div>
        </div>

        <div style={{marginTop:'50px'}}>
          {tarefaSelecionada.status === 'enviar_cliente' && (
            <div style={{background:'#242427', padding:'40px', borderRadius:'28px', border:'1px solid #22c55e50'}}>
                <label style={{...labelModalStyle, color:'#4ade80', fontSize: '18px'}}>AÇÃO REQUERIDA</label>
                <p style={{color: '#9e9e9e', marginBottom: '25px', fontSize: '14px'}}>Confirme após enviar os documentos ao cliente.</p>
                <button onClick={() => handleConfirmarEnvioPV(tarefaSelecionada)} style={{background:'#22c55e', color:'#fff', padding:'20px 45px', border:'none', borderRadius:'14px', cursor:'pointer', fontSize: '18px', display:'flex', alignItems:'center', gap:'15px', transition:'0.3s'}}>
                    <Send size={22}/> MARCAR COMO ENVIADO AO CLIENTE
                </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#2a2a2d', borderLeft:'1px solid #55555a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '95%', height: '92%' }}>
         {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
        </div>
      </div>

     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
    .kanban-card { background: #313134; border: 1px solid #55555a; border-radius: 20px; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; margin-bottom: 5px; flex-shrink: 0; }
    .kanban-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-color: #71717a; }
    .btn-back { background: transparent; color: #9e9e9e; border: 1px solid #55555a; padding: 12px 28px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size:14px; transition: 0.2s; margin-bottom:10px; }
    .btn-back:hover { background: #55555a; color: #fff; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
    ::-webkit-scrollbar { width: 8px; height: 12px; }
    ::-webkit-scrollbar-track { background: #2a2a2d; }
    ::-webkit-scrollbar-thumb { background: #3f3f44; border-radius: 10px; border: 2px solid #2a2a2d; }
   `}</style>
  </div>
 )
}

function AttachmentTag({ label, fileUrl, onUpload, disabled = false }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#f5f6fa10', border: '1px solid #55555a', borderRadius: '12px', overflow: 'hidden', minWidth:'260px' }}>
            <span style={{ padding: '12px 18px', fontSize: '12px', color: fileUrl ? '#4ade80' : '#9e9e9e', borderRight: '1px solid #55555a', flex: 1, whiteSpace: 'nowrap' }}>{label}</span>
            <div style={{ display: 'flex' }}>
                {fileUrl && (
                    <button title="Ver" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} /></button>
                )}
                {!disabled && (
                    <>
                        <button title="Upload" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} /></button>
                        <input type="file" ref={fileInputRef} hidden onChange={(e) => onUpload(e.target.files[0])} />
                    </>
                )}
            </div>
        </div>
    );
}

const cascadeRowStyle = { display: 'grid', gridTemplateColumns: '150px 220px 180px 320px', gap: '20px', alignItems: 'center', background: '#3f3f4440', padding: '15px', borderRadius: '14px', border: '1px solid #55555a50' };
const cascadeLabelStyle = { fontSize: '12px', color: '#9e9e9e', fontWeight: '600', letterSpacing: '1px' };
const inputCascadeStyle = { background: '#242427', border: '1px solid #55555a', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px', outline: 'none' };
const cascadeValueStyle = { fontSize: '18px', color: '#fff', fontWeight: '500' };

const inputFilterStyle = { padding: '16px 20px 16px 52px', width: '100%', borderRadius: '14px', border: '1px solid #55555a', outline: 'none', background:'#3f3f44', color:'#fff', fontSize: '18px', boxSizing: 'border-box' };
const iconFilterStyle = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e', zIndex: 10 };
const cardInfoStyle = { display:'flex', alignItems:'center', gap:'12px', color:'#d1d5db', fontSize:'15px', marginBottom:'10px' };
const miniTagStyle = { background:'#3f3f44', padding:'10px 15px', borderRadius:'12px', fontSize:'12px', color:'#fff', display:'inline-flex', alignItems:'center', gap:'8px', border:'1px solid #55555a' };
const inputStyleModal = { width: '100%', padding: '20px', border: '1px solid #55555a', borderRadius: '15px', outline: 'none', background:'#242427', color:'#fff', fontSize: '18px', boxSizing: 'border-box' };
const labelModalStyle = { fontSize:'14px', color:'#9e9e9e', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px', display:'block' };
const pModalStyle = { fontSize:'32px', color:'#fff', margin:'0' };
const fieldBoxModal = { border: '1px solid #55555a', padding: '25px', borderRadius: '22px', background: '#2a2a2d', flex: 1 };
const fieldBoxInner = { padding: '10px' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '12px 15px', color: '#fff', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };