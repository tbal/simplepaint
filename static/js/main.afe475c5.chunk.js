(this["webpackJsonprma-project"]=this["webpackJsonprma-project"]||[]).push([[0],{12:function(e,t,n){},13:function(e,t,n){},14:function(e,t,n){"use strict";n.r(t);var o=n(0),a=n.n(o),c=n(5),r=n.n(c),i=(n(12),n(6)),l=n(3),u=(n(13),new Path2D("m129.03125 63.3125c0-34.914062-28.941406-63.3125-64.519531-63.3125-35.574219 0-64.511719 28.398438-64.511719 63.3125 0 29.488281 20.671875 54.246094 48.511719 61.261719v162.898437c0 53.222656 44.222656 96.527344 98.585937 96.527344h10.316406c54.363282 0 98.585938-43.304688 98.585938-96.527344v-95.640625c0-7.070312-4.640625-13.304687-11.414062-15.328125-6.769532-2.015625-14.082032.625-17.960938 6.535156l-42.328125 64.425782c-4.847656 7.390625-2.800781 17.3125 4.582031 22.167968 7.386719 4.832032 17.304688 2.792969 22.160156-4.585937l12.960938-19.71875v42.144531c0 35.582032-29.863281 64.527344-66.585938 64.527344h-10.316406c-36.714844 0-66.585937-28.945312-66.585937-64.527344v-162.898437c27.847656-7.015625 48.519531-31.773438 48.519531-61.261719zm-97.03125 0c0-17.265625 14.585938-31.3125 32.511719-31.3125 17.929687 0 32.511719 14.046875 32.511719 31.3125 0 17.261719-14.582032 31.3125-32.511719 31.3125-17.925781 0-32.511719-14.050781-32.511719-31.3125zm0 0"));function s(){var e=function(e){var t=a.a.useState(JSON.parse(localStorage.getItem("draw-app"))||e),n=Object(l.a)(t,2),o=n[0],c=n[1];return a.a.useEffect((function(){localStorage.setItem("draw-app",JSON.stringify(o))})),[o,c]}([]),t=Object(l.a)(e,2),n=t[0],o=t[1],c=a.a.useRef(null);return a.a.useEffect((function(){var e=c.current.getContext("2d");e.clearRect(0,0,window.innerWidth,window.innerHeight),n.forEach((function(t){return function(e,t){e.fillStyle="deepskyblue",e.shadowColor="dodgerblue",e.shadowBlur=20,e.save(),e.scale(.3,.3),e.translate(t.x/.3-80,t.y/.3-80),e.fill(u),e.restore()}(e,t)}))})),[n,o,c]}var d=function(){var e=s(),t=Object(l.a)(e,3),n=t[0],o=t[1],c=t[2];return console.log(localStorage),a.a.createElement(a.a.Fragment,null,a.a.createElement("div",{className:"controls"},a.a.createElement("button",{onClick:function(){o([])}},"Clear"),a.a.createElement("button",{onClick:function(){o(n.slice(0,-1))}},"Undo"),a.a.createElement("button",{onClick:function(){!function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"image.png",n=document.createElement("a");n.setAttribute("href",e),n.setAttribute("download",t),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}(c.current.toDataURL())}},"Export PNG")),a.a.createElement("canvas",{ref:c,width:window.innerWidth,height:window.innerHeight,onClick:function(e){var t={x:e.clientX,y:e.clientY};o([].concat(Object(i.a)(n),[t]))}}))};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));r.a.render(a.a.createElement(a.a.StrictMode,null,a.a.createElement(d,null)),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))},7:function(e,t,n){e.exports=n(14)}},[[7,1,2]]]);
//# sourceMappingURL=main.afe475c5.chunk.js.map