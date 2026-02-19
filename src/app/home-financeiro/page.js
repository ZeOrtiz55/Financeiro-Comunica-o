'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Edit3, RefreshCw, AlertCircle, Trash, DollarSign
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO (ESTILO CLARO) ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#0f172a', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
        Painel Financeiro <br /> 
        <span style={{ fontWeight: '400', fontSize: '32px', color: '#0ea5e9' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA ---
const formatarData = (dataStr) => {
 if (!dataStr || dataStr === 'null' || dataStr.trim() === '') return 'N/A';
 const apenasData = dataStr.split(' ')[0];
 const partes = apenasData.split(/[-/]/);
 if (partes.length === 3) {
  if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return `${partes[0]}/${partes[1]}/${partes[2]}`;
 }
 return dataStr;
};

function GeometricBackground() {
 return (
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f1f5f9', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(203, 213, 225, 0.4) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const colunaLink = tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : tipo === 'rh' ? 'rh_id' : 'chamado_id';

 useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  supabase.from('mensagens_chat').select('*').eq(colunaLink, registroId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_h_fin_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaLink}=eq.${registroId}` }, payload => { 
   if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
 }, [registroId, userProfile?.id, colunaLink]);

 const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  const payload = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
  payload[colunaLink] = registroId;
  await supabase.from('mensagens_chat').insert([payload]);
 }
 return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
   <div style={{ padding: '15px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '400', fontSize: '15px', color:'#64748b', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#0ea5e915' : '#f1f5f9', color: '#1e293b', padding: '14px 18px', borderRadius: '18px', maxWidth:'85%', border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: '15px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>{m.usuario_nome?.toUpperCase()}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#f8fafc', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: '15px' }} />
     <button style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
   </form>
  </div>
 )
}

export default function HomeFinanceiro() {
 const [userProfile, setUserProfile] = useState(null); const [loading, setLoading] = useState(true); const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [showNovoMenu, setShowNovoMenu] = useState(false);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
 const [listaBoletos, setListaBoletos] = useState([]); const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]); const [listaRH, setListaRH] = useState([]);
 const [fileBoleto, setFileBoleto] = useState(null);
 const router = useRouter();

 const carregarDados = async () => {
  const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').neq('status', 'pago').order('id', {ascending: false});
  
  let tarefasFaturamento = [];
  (bolds || []).forEach(c => {
    const statusPendentes = ['gerar_boleto', 'validar_pix'];
    if (c.qtd_parcelas > 1) {
        for (let i = 1; i <= c.qtd_parcelas; i++) {
            const stParc = c[`status_p${i}`] || 'gerar_boleto';
            if (statusPendentes.includes(stParc)) {
                const valorBanco = c[`valor_parcela${i}`];
                const valorCalculado = (valorBanco && valorBanco > 0) ? valorBanco : (c.valor_servico / c.qtd_parcelas).toFixed(2);
                tarefasFaturamento.push({ 
                    ...c, id_virtual: `${c.id}_p${i}`, nom_cliente: `${c.nom_cliente} (P${i})`, 
                    valor_exibicao: valorCalculado, status: stParc, num_parcela: i, gTipo: 'boleto',
                    vencimento_boleto: c.datas_parcelas?.split(/[\s,]+/)[i-1] || c.vencimento_boleto,
                    anexo_boleto: c[`anexo_boleto_p${i}`],
                    comprovante_pagamento: c[`comprovante_pagamento_p${i}`]
                });
            }
        }
    } else {
        if (statusPendentes.includes(c.status)) {
            tarefasFaturamento.push({ ...c, valor_exibicao: c.valor_servico, num_parcela: null, gTipo: 'boleto' });
        }
    }
  });

  setListaBoletos(tarefasFaturamento);
  const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'financeiro');
  const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'financeiro');
  const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido');
  setListaPagar((pag || []).map(p => ({...p, gTipo: 'pagar'}))); 
  setListaReceber((rec || []).map(r => ({...r, gTipo: 'receber'}))); 
  setListaRH((rhData || []).map(rh => ({...rh, gTipo: 'rh'})));
 }

 // REALTIME CONFIG
 useEffect(() => {
    const channel = supabase
      .channel('home_financeiro_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_pagar' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_receber' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_rh' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
 }, []);

 useEffect(() => {
  const carregar = async () => {
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) return router.push('/login');
   const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
   setUserProfile(prof); setLoading(false); carregarDados();
  }; carregar();
 }, [router]);

 const handleUpdateField = async (t, field, value) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    const finalField = (t.gTipo === 'boleto' && t.id_virtual) && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field) ? `${field}_p${t.num_parcela}` : field;
    await supabase.from(table).update({ [finalField]: value }).eq('id', t.id);
    carregarDados();
 };

 const handleUpdateFileDirect = async (t, field, file) => {
    if(!file) return;
    try {
      const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      let col = field;
      if (t.gTipo === 'boleto' && t.id_virtual && ['anexo_boleto', 'comprovante_pagamento'].includes(field)) {
          col = `${field}_p${t.num_parcela}`;
      } else if (t.gTipo === 'boleto' && t.id_virtual && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field)) {
          col = `${field}_p${t.num_parcela}`;
      }
      
      await supabase.from(table).update({ [col]: linkData.publicUrl }).eq('id', t.id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleGerarBoletoFinanceiro = async (t) => {
  if (!fileBoleto) return alert("Anexe o boleto.");
  try {
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    await supabase.storage.from('anexos').upload(path, fileBoleto);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    const isParcela = !!t.id_virtual;
    
    let updateData = isParcela ? 
        { [`status_p${t.num_parcela}`]: 'enviar_cliente', [`tarefa_p${t.num_parcela}`]: 'Enviar Boleto para o Cliente', [`anexo_boleto_p${t.num_parcela}`]: data.publicUrl } : 
        { status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl };
    
    await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
    alert("Tarefa enviada!"); setTarefaSelecionada(null);
  } catch (err) { alert("Erro: " + err.message); }
 };

 const handleMoverParaPago = async (t) => {
    try {
        const isParcela = !!t.id_virtual;
        let updateData = isParcela ? { [`status_p${t.num_parcela}`]: 'pago', [`tarefa_p${t.num_parcela}`]: 'Pagamento Confirmado' } : { status: 'pago', tarefa: 'Pagamento Confirmado' };
        await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
        alert("Pagamento confirmado!"); setTarefaSelecionada(null);
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleConcluirGeral = async (t) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    await supabase.from(table).update({ status: 'concluido' }).eq('id', t.id);
    alert("Processo concluído!"); setTarefaSelecionada(null);
 };

 if (loading) return <LoadingScreen />

 return (
  <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: '#f8fafc' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/home-financeiro" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '60px', transition: '0.4s ease' }}>
    <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
      <div><h1 style={{ fontWeight: '300', color: '#1e293b', margin: 0, fontSize:'42px', letterSpacing:'-2px' }}>Painel Financeiro</h1><div style={{ width: '80px', height: '4px', background: '#0ea5e9', marginTop: '12px' }}></div></div>
      <div style={{ position: 'relative' }}>
       <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#fff', color:'#1e293b', border:'1px solid #e2e8f0', padding:'12px 24px', borderRadius:'14px', fontWeight:'400', cursor:'pointer', fontSize:'15px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>NOVO CHAMADO</button>
       {showNovoMenu && (
        <div onMouseLeave={() => setShowNovoMenu(false)} style={dropItemStyle_Container}>
         <div onClick={() => router.push('/novo-chamado-nf')} style={dropItemStyle}>Chamado de Boleto</div>
         <div onClick={() => router.push('/novo-pagar-receber')} style={dropItemStyle}>Chamado Pagar/Receber</div>
         <div onClick={() => router.push('/novo-chamado-rh')} style={{ ...dropItemStyle, borderBottom:'none', color:'#0ea5e9' }}>Chamado de RH</div>
        </div>
       )}
      </div>
    </header>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>Faturamento</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaBoletos.map(t => (
         <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{ background: '#fff', padding: '24px', color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}><h4 style={{ margin: 0, fontSize: '18px', fontWeight:'400' }}>{t.nom_cliente?.toUpperCase()}</h4></div>
          <div style={{ padding: '24px', background: '#f8fafc' }}>
           <div style={miniTagStyle}><CreditCard size={14}/> {t.forma_pagamento?.toUpperCase()}</div>
           <div style={{fontSize:'26px', color:'#1e293b', margin: '15px 0 5px 0', fontWeight: '400'}}>R$ {t.valor_exibicao}</div>
           <div style={{fontSize:'15px', color: '#64748b', textTransform:'uppercase', letterSpacing:'1px'}}>{t.status === 'validar_pix' ? 'VALIDAÇÃO PIX' : `Venc: ${formatarData(t.vencimento_boleto)}`}</div>
          </div>
         </div>
        ))}
      </div>
     </div>

     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>Contas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaPagar.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#fff', borderLeft: '6px solid #ef4444'}}><h4 style={{fontSize:'15px', color:'#64748b', fontWeight:'400'}}>A PAGAR</h4><div style={{fontSize:'24px', color:'#1e293b', marginTop:'5px'}}>{t.fornecedor?.toUpperCase()}</div><div style={{fontSize:'24px', color:'#1e293b', marginTop:'10px'}}>R$ {t.valor}</div></div>
         </div>
        ))}
        {listaReceber.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#fff', borderLeft: '6px solid #0ea5e9'}}><h4 style={{fontSize:'15px', color:'#64748b', fontWeight:'400'}}>A RECEBER</h4><div style={{fontSize:'24px', color:'#1e293b', marginTop:'5px'}}>{t.cliente?.toUpperCase()}</div><div style={{fontSize:'24px', color:'#1e293b', marginTop:'10px'}}>R$ {t.valor}</div></div>
         </div>
        ))}
      </div>
     </div>

     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>RH</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaRH.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#fff', borderLeft: '6px solid #8b5cf6'}}>
            <h4 style={{fontSize:'20px', color:'#1e293b', fontWeight:'400'}}>{t.funcionario?.toUpperCase()}</h4>
            <div style={{fontSize:'15px', color:'#0ea5e9', marginTop:'10px', textTransform:'uppercase', letterSpacing:'1px'}}>{t.setor}</div>
            <div style={{fontSize:'15px', color:'#64748b', marginTop:'5px'}}>{t.titulo}</div>
          </div>
         </div>
        ))}
      </div>
     </div>
    </div>
   </main>

   {tarefaSelecionada && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#fff', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
      
      <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto', color: '#1e293b' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back-light"><ArrowLeft size={16}/> VOLTAR AO PAINEL</button>
        <h2 style={{fontSize:'62px', color:'#1e293b', fontWeight:'300', lineHeight:'1.1', margin:'25px 0 45px'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario || tarefaSelecionada.cliente}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelModalStyle}>TIPO PROCESSO</label><p style={pModalStyle}>{tarefaSelecionada.gTipo?.toUpperCase()}</p></div>
          {tarefaSelecionada.gTipo !== 'rh' && (
            <>
              <div style={fieldBoxModal}><label style={labelModalStyle}>VALOR TOTAL</label><p style={{...pModalStyle, fontSize:'36px'}}>R$ {tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor}</p></div>
              <div style={fieldBoxModal}><label style={labelModalStyle}>VENCIMENTO</label><p style={{...pModalStyle, color:'#ef4444'}}>{formatarData(tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento)}</p></div>
            </>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'30px', border:'1px solid #e2e8f0', padding:'45px', borderRadius:'35px', background:'#f8fafc' }}>
          {tarefaSelecionada.gTipo === 'rh' ? (
            <>
              <div style={fieldBoxInner}><label style={labelModalStyle}>FUNCIONÁRIO</label><p style={{fontSize:'15px'}}>{tarefaSelecionada.funcionario?.toUpperCase()}</p></div>
              <div style={fieldBoxInner}><label style={labelModalStyle}>SETOR</label><p style={{fontSize:'15px', color:'#0ea5e9'}}>{tarefaSelecionada.setor?.toUpperCase()}</p></div>
              <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelModalStyle}>TÍTULO DO CHAMADO</label><p style={{fontSize:'15px'}}>{tarefaSelecionada.titulo}</p></div>
              <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelModalStyle}>DESCRIÇÃO COMPLETA</label><p style={{fontSize:'15px', lineHeight:'1.6', color:'#64748b'}}>{tarefaSelecionada.descricao}</p></div>
            </>
          ) : (
            <>
              <div style={fieldBoxInner}><label style={labelModalStyle}>ID REGISTRO</label><p style={{fontSize:'15px', color: '#1e293b'}}>#{tarefaSelecionada.id}</p></div>
              <div style={fieldBoxInner}><label style={labelModalStyle}>MÉTODO / CONDIÇÃO</label><p style={{fontSize:'15px', color: '#1e293b'}}>{tarefaSelecionada.forma_pagamento || tarefaSelecionada.motivo || 'N/A'}</p></div>
              {tarefaSelecionada.gTipo === 'boleto' && (
                <>
                    <div style={fieldBoxInner}><label style={labelModalStyle}>NF SERVIÇO</label><input style={inputStyleDark} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_servico', e.target.value)} /></div>
                    <div style={fieldBoxInner}><label style={labelModalStyle}>NF PEÇA</label><input style={inputStyleDark} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_peca', e.target.value)} /></div>
                </>
              )}
              <div style={{gridColumn:'span 2', ...fieldBoxInner}}><label style={labelModalStyle}>OBSERVAÇÕES DO PROCESSO</label><textarea style={{...inputStyleDark, height:'120px', resize: 'none'}} defaultValue={tarefaSelecionada.obs || tarefaSelecionada.motivo} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'obs' : 'motivo', e.target.value)} /></div>
            </>
          )}
        </div>

        <div style={{marginTop:'40px'}}>
            <label style={labelModalStyle}>ANEXOS E DOCUMENTOS</label>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', file)} />
                <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', file)} />
                <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_boleto', file)} />
                
                {tarefaSelecionada.status !== 'gerar_boleto' && (
                    <AttachmentTag label="COMPROVANTE" fileUrl={tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.anexo_pix} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'comprovante_pagamento', file)} />
                )}
            </div>
        </div>

        <div style={{marginTop:'50px', display:'flex', gap:'20px'}}>
            {tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{flex: 1, background:'#f8fafc', padding:'40px', borderRadius:'28px', border:'1px solid #e2e8f0'}}>
                    <label style={{...labelModalStyle, color:'#0ea5e9', fontSize: '15px'}}>ANEXAR BOLETO</label>
                    <div style={{display:'flex', gap:'25px', marginTop:'20px', alignItems: 'center'}}>
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                            <button style={{ 
                                background: '#fff', color: '#1e293b', border: '1px dashed #cbd5e1', 
                                padding: '18px 25px', borderRadius: '15px', width: '100%', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '12px', transition: '0.2s'
                            }}>
                                <Upload size={22} color={fileBoleto ? "#22c55e" : "#0ea5e9"} />
                                <span style={{ fontSize: '15px', color: fileBoleto ? "#1e293b" : "#64748b" }}>
                                    {fileBoleto ? fileBoleto.name : "Clique para selecionar o boleto..."}
                                </span>
                            </button>
                            <input type="file" onChange={e => setFileBoleto(e.target.files[0])} style={{ position: 'absolute', fontSize: '100px', opacity: 0, right: 0, top: 0, cursor: 'pointer' }} />
                        </div>

                        <div className="tooltip-container">
                            <button onClick={() => handleGerarBoletoFinanceiro(tarefaSelecionada)} style={btnPrimaryStyle}>LANÇAR TAREFA</button>
                            <div className="tooltip-box">Anexar Boleto e Gerar tarefa para o Pós Vendas enviar para o cliente</div>
                        </div>
                    </div>
                </div>
            )}

            {tarefaSelecionada.status === 'validar_pix' && (
                <button onClick={() => handleMoverParaPago(tarefaSelecionada)} style={{flex: 1, background:'#0ea5e9', color:'#fff', border:'none', padding:'20px', borderRadius:'20px', cursor:'pointer', fontSize: '17px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', fontWeight:'500'}}>
                    <DollarSign size={24}/> CONFIRMAR PIX E MOVER PARA PAGO
                </button>
            )}
            
            {tarefaSelecionada.gTipo !== 'boleto' && (
                <button onClick={() => handleConcluirGeral(tarefaSelecionada)} style={{flex: 1, background:'#22c55e', color:'#fff', border:'none', padding:'20px', borderRadius:'20px', cursor:'pointer', fontSize: '17px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', fontWeight:'500'}}>
                    <CheckCheck size={24}/> CONCLUIR PROCESSO
                </button>
            )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft:'1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ width: '95%', height: '92%' }}>
        {userProfile && <ChatChamado registroId={tarefaSelecionada.id} tipo={tarefaSelecionada.gTipo} userProfile={userProfile} />}
       </div>
      </div>
     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; }
    .task-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; cursor: pointer; transition: 0.3s ease; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
    .task-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #0ea5e9; }
    .btn-back-light { background: #fff; color: #64748b; border: 1px solid #e2e8f0; padding: 10px 24px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; font-size:15px; }
    button:hover { opacity: 0.9 !important; transform: translateY(-1px); }

    .tooltip-container { position: relative; display: flex; }
    .tooltip-box { 
        position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
        background: #1e293b; color: #fff; padding: 15px 20px; border-radius: 12px;
        font-size: 15px; width: 320px; text-align: center; pointer-events: none;
        opacity: 0; transition: 0.3s; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .tooltip-container:hover .tooltip-box { opacity: 1; bottom: 120%; }
   `}</style>
  </div>
 )
}

// --- COMPONENTE INTERNO DE TAG DE ANEXO ---
function AttachmentTag({ label, fileUrl, onUpload, disabled }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', minWidth:'240px' }}>
            <span style={{ padding: '12px 18px', fontSize: '15px', color: fileUrl ? '#16a34a' : '#64748b', borderRight: '1px solid #e2e8f0', flex: 1, fontWeight:'500' }}>{label}</span>
            <div style={{ display: 'flex' }}>
                {fileUrl && (
                    <button title="Ver arquivo" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} color="#1e293b"/></button>
                )}
                {!disabled && (
                    <>
                        <button title="Substituir/Anexar" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} color="#0ea5e9"/></button>
                        <input type="file" ref={fileInputRef} hidden onChange={(e) => onUpload(e.target.files[0])} />
                    </>
                )}
            </div>
        </div>
    );
}

const dropItemStyle_Container = { position:'absolute', top:'60px', right: 0, background:'#fff', borderRadius:'20px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)', zIndex:2000, width:'300px', border:'1px solid #e2e8f0', overflow:'hidden' };
const dropItemStyle = { padding:'15px 25px', cursor:'pointer', color:'#1e293b', background: '#fff', borderBottom:'1px solid #f1f5f9', fontSize:'15px' };
const colWrapperStyle = { padding: '20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '24px', border: '1px solid #e2e8f0' };
const colTitleStyle = { textAlign: 'center', fontSize: '22px', color:'#64748b', fontWeight:'400', marginBottom:'35px', textTransform:'uppercase', letterSpacing:'2px' };
const miniTagStyle = { background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0' };
const labelModalStyle = { fontSize:'15px', color:'#64748b', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:'12px', fontWeight:'500' };
const pModalStyle = { fontSize:'24px', color:'#1e293b', margin:'0' };
const fieldBoxModal = { border: '1px solid #e2e8f0', padding: '25px', borderRadius: '22px', background: '#f8fafc', flex: 1 };
const fieldBoxInner = { padding: '10px', borderRadius: '14px', background: 'transparent' };
const inputStyleDark = { width: '100%', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '15px', outline: 'none', background:'#fff', color:'#1e293b', fontSize: '15px', boxSizing: 'border-box' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '10px 15px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnPrimaryStyle = { background:'#0ea5e9', color:'#fff', border:'none', padding:'18px 35px', borderRadius:'15px', cursor:'pointer', fontSize: '16px', fontWeight: '500', transition: '0.3s' };