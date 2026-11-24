import { Link } from "react-router-dom";
import { Mascot } from "../components/ui";

export default function Welcome() {
  return (
    <main className="hero">
      <div>
        <div className="brand">Caderno</div>
        <p className="muted" style={{ fontSize: "1.15rem", marginTop: 6 }}>
          Seu espaço para estudar com foco e constância.
        </p>
      </div>

      <div className="hero-art" aria-hidden>
        <div className="blob" style={{ width: 220, height: 200, left: "8%", top: 30, background: "var(--lavender)" }} />
        <div className="blob" style={{ width: 160, height: 150, right: "6%", top: 120, background: "var(--mint)" }} />
        <div style={{ position: "absolute", left: "14%", top: 40 }}>
          <Mascot mood="foco" size={96} />
        </div>
        <div style={{ position: "absolute", right: "14%", top: 20, animationDelay: "0.6s" }}>
          <Mascot mood="motivacao" size={80} />
        </div>
        <div style={{ position: "absolute", left: "40%", top: 150 }}>
          <Mascot mood="conquista" size={88} />
        </div>
        <div style={{ position: "absolute", right: "8%", top: 190 }}>
          <Mascot mood="calma" size={60} />
        </div>
      </div>

      <ul className="stack muted" style={{ paddingLeft: 18, margin: 0 }}>
        <li>Organize matérias em cadernos e assuntos.</li>
        <li>Registre o tempo de estudo e acompanhe suas metas.</li>
        <li>Pratique com questões geradas por IA no estilo da banca.</li>
      </ul>

      <div className="stack">
        <Link to="/cadastro" className="btn btn-primary btn-lg btn-block">
          Criar minha conta
        </Link>
        <Link to="/entrar" className="btn btn-ghost btn-lg btn-block">
          Já tenho uma conta
        </Link>
        <p className="tiny muted center">
          Ao continuar, você concorda com os <a href="#/bem-vindo" onClick={(e) => { e.preventDefault(); alert(TERMS); }}>termos de uso</a> e a{" "}
          <a href="#/bem-vindo" onClick={(e) => { e.preventDefault(); alert(PRIVACY); }}>política de privacidade</a>.
        </p>
      </div>
    </main>
  );
}

export const TERMS =
  "Termos de uso (resumo)\n\nO Caderno é uma ferramenta de apoio aos estudos. As questões geradas por IA são inspiradas no estilo das bancas e não são questões oficiais. Confira legislação e conteúdos sujeitos a atualização em fontes oficiais.";

export const PRIVACY =
  "Política de privacidade (resumo)\n\nNesta versão, seus dados ficam salvos apenas neste dispositivo/navegador. Quando você gera questões ou pede explicações, o conteúdo selecionado (matéria, assuntos e o material que você escolher enviar) é enviado ao serviço de IA somente para criar a resposta. Você pode exportar ou excluir seus dados a qualquer momento no Perfil.";
