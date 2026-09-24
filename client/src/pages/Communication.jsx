import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Communication(){
  const {user}=useAuth();
  const [contacts,setContacts]=useState([]),[messages,setMessages]=useState([]),[contactId,setContactId]=useState('');
  const [subject,setSubject]=useState(''),[body,setBody]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
  const selectedId=Number(contactId),selectedContact=contacts.find(c=>c.id===selectedId);
  const conversation=useMemo(()=>messages.filter(m=>m.sender_user_id===selectedId||m.recipient_user_id===selectedId).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),[messages,selectedId]);
  async function load(){setLoading(true);setError('');try{const [c,m]=await Promise.all([api.getCommunicationContacts(),api.getMessages()]);const next=c.items||[];setContacts(next);setMessages(m.items||[]);if(!contactId&&next.length)setContactId(String(next[0].id))}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  useEffect(()=>{messages.filter(m=>m.recipient_user_id===user?.id&&!m.read_at).forEach(m=>api.markMessageRead(m.id).catch(()=>{}))},[messages,user?.id]);
  async function send(e){e.preventDefault();if(!selectedId||!body.trim())return;setSending(true);setError('');try{await api.sendMessage({recipientUserId:selectedId,subject,body:body.trim()});setBody('');setSubject('');await load()}catch(e){setError(e.message)}finally{setSending(false)}}
  const isFaculty=user?.role==='faculty';
  return <div className="page-stack campus-page">
    <section className="page-hero campus-hero communication-hero"><div><span className="eyebrow">Academic Support</span><h1>{isFaculty?'Student Doubt Desk':'Faculty Communication'}</h1><p>{isFaculty?'Respond to student questions and keep academic conversations in one place.':'Ask your selected faculty member a doubt and continue the conversation until it is resolved.'}</p></div><div className="campus-hero-icon">✉</div></section>
    {error&&<div className="alert-card danger">⚠ <span>{error}</span></div>}
    <div className="communication-layout">
      <section className="panel campus-panel message-compose"><div className="section-heading campus-heading"><div><span className="eyebrow">New message</span><h2>{isFaculty?'Reply to student':'Ask your faculty'}</h2></div><span className="compose-badge">Academic</span></div>
        <form onSubmit={send} className="communication-form">
          <label>{isFaculty?'Student':'Faculty'}<select value={contactId} onChange={e=>setContactId(e.target.value)} required><option value="">Select {isFaculty?'student':'faculty'}</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.full_name}{c.email?' — '+c.email:''}</option>)}</select></label>
          <label>Subject<span>Short topic for this doubt</span><input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={200} placeholder="e.g. Data Structures — AVL Tree doubt" /></label>
          <label>Message<textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} maxLength={5000} placeholder={isFaculty?'Write your explanation or reply...':'Describe your doubt clearly so your faculty can help you...'} required /></label>
          <div className="form-footer"><small>{body.length}/5000</small><button className="primary-button" disabled={sending||!selectedId}>{sending?'Sending…':'Send Message →'}</button></div>
        </form>
      </section>
      <section className="panel campus-panel conversation-panel"><div className="section-heading campus-heading"><div><span className="eyebrow">Conversation</span><h2>{selectedContact?.full_name||'Select a contact'}</h2></div>{selectedContact&&<span className="history-count">{conversation.length} message{conversation.length===1?'':'s'}</span>}</div>
        {loading?<div className="campus-empty"><div className="empty-icon">◷</div><strong>Loading conversation</strong></div>:conversation.length?<div className="message-list">{conversation.map(m=>{const mine=m.sender_user_id===user?.id;return <article className={'message-bubble-row '+(mine?'mine':'')} key={m.id}><div className="message-avatar">{(mine?'You':m.sender_name).slice(0,1).toUpperCase()}</div><div className="message-bubble"><div className="message-top"><strong>{mine?'You':m.sender_name}</strong><time>{new Date(m.created_at).toLocaleString()}</time></div>{m.subject&&<span className="message-subject">{m.subject}</span>}<p>{m.body}</p></div></article>})}</div>:<div className="campus-empty"><div className="empty-icon">✉</div><strong>No messages yet</strong><span>Start the conversation with {selectedContact?.full_name||'a contact'}.</span></div>}
      </section>
    </div>
  </div>;
}
