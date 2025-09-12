import{u as d,j as e,b3 as p,ah as u,X as i,aq as g,ar as f,k as m,b4 as h,b5 as x,I as b,aI as j,b6 as M,d as C,b7 as k}from"./strapi-DAjSWN8J.js";import{u as y}from"./useAdminRoles-BQ4F5_Gp-Qm6nGREC.js";const v=({children:a,target:o})=>{const{toggleNotification:n}=m(),{formatMessage:t}=d(),{copy:r}=h(),l=t({id:"app.component.CopyToClipboard.label",defaultMessage:"Copy to clipboard"}),c=async s=>{s.preventDefault(),await r(o)&&n({type:"info",message:t({id:"notification.link-copied"})})};return e.jsx(x,{endAction:e.jsx(b,{label:l,variant:"ghost",onClick:c,children:e.jsx(j,{})}),title:o,titleEllipsis:!0,subtitle:a,icon:e.jsx("span",{style:{fontSize:32},children:"✉️"}),iconBackground:"neutral100"})},I=({registrationToken:a})=>{const{formatMessage:o}=d(),n=`${window.location.origin}${p()}/auth/register?registrationToken=${a}`;return e.jsx(v,{target:n,children:o({id:"app.components.Users.MagicLink.connect",defaultMessage:"Copy and share this link to give access to this user"})})},E=({disabled:a})=>{const{isLoading:o,roles:n}=y(),{formatMessage:t}=d(),{value:r=[],onChange:l,error:c}=u("roles");return e.jsxs(i.Root,{error:c,hint:t({id:"app.components.Users.ModalCreateBody.block-title.roles.description",defaultMessage:"A user can have one or several roles"}),name:"roles",required:!0,children:[e.jsx(i.Label,{children:t({id:"app.components.Users.ModalCreateBody.block-title.roles",defaultMessage:"User's roles"})}),e.jsx(g,{disabled:a,onChange:s=>{l("roles",s)},placeholder:t({id:"app.components.Select.placeholder",defaultMessage:"Select"}),startIcon:o?e.jsx(R,{}):void 0,value:r.map(s=>s.toString()),withTags:!0,children:n.map(s=>e.jsx(f,{value:s.id.toString(),children:t({id:`global.${s.code}`,defaultMessage:s.name})},s.id))}),e.jsx(i.Error,{}),e.jsx(i.Hint,{})]})},S=k`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`,L=C.div`
  animation: ${S} 2s infinite linear;
`,R=()=>e.jsx(L,{children:e.jsx(M,{})});export{I as M,E as S,v as a};
