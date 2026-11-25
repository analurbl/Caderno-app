/* ==========================================================
   CASOS — edite aqui. Para cada princípio, o gabarito é
   "respeitado", "ferido" ou "foco" (não é o foco do caso),
   seguido da explicação mostrada ao aluno.
   ========================================================== */
const PRINCIPIOS = [
  { id: "autonomia", nome: "Autonomia", def: "Respeitar a decisão livre e informada da pessoa sobre o próprio corpo e tratamento." },
  { id: "beneficencia", nome: "Beneficência", def: "Agir para promover o bem e o melhor interesse do paciente." },
  { id: "naoMaleficencia", nome: "Não maleficência", def: "Não causar dano; evitar riscos e sofrimentos desnecessários." },
  { id: "justica", nome: "Justiça", def: "Distribuir recursos e cuidados com equidade, conforme a necessidade." }
];

const OPCOES = [
  { v: "respeitado", t: "Respeitado" },
  { v: "ferido", t: "Ferido" },
  { v: "foco", t: "Não é o foco" }
];

const CASOS = [
  {
    titulo: "Espera na UPA",
    tema: "Acesso e prioridade",
    texto: [
      "Numa UPA lotada, a recepção atende por ordem de chegada, sem classificação de risco. Seu Antônio, 62 anos, chega com dor forte no peito, suando frio, e recebe a senha 48.",
      "Ele espera quase duas horas atrás de pessoas com resfriado e pequenos cortes. Quando é atendido, o eletrocardiograma mostra um infarto, e o tratamento começa tarde, com mais sequelas."
    ],
    gabarito: {
      autonomia: ["foco", "O caso não trata de uma decisão do paciente sendo ignorada; o problema está na organização do atendimento."],
      beneficencia: ["ferido", "O serviço deixou de agir no melhor interesse de quem mais precisava de cuidado imediato."],
      naoMaleficencia: ["ferido", "A demora evitável aumentou o dano ao paciente (mais sequelas do infarto)."],
      justica: ["ferido", "Equidade é tratar de forma diferente necessidades diferentes. Ordem de chegada para casos de gravidade diferente não é justa; a classificação de risco existe para isso."]
    }
  },
  {
    titulo: "Exames por precaução",
    tema: "Risco e consentimento",
    texto: [
      "Dona Lúcia, 78 anos, procura o ambulatório de um hospital público por cansaço leve. Sem indicação clínica clara, o médico pede vários exames, incluindo um cateterismo, \"só para garantir\".",
      "Ele não explica os riscos do procedimento, e ela assina o termo sem entender. A fila para cateterismo no hospital é de três meses. Durante o exame, Dona Lúcia tem um sangramento na virilha e fica internada uma semana."
    ],
    gabarito: {
      autonomia: ["ferido", "Assinar sem entender não é consentimento informado: os riscos e as alternativas precisavam ser explicados de forma clara."],
      beneficencia: ["ferido", "Um procedimento invasivo sem indicação não traz benefício esperado que justifique o risco."],
      naoMaleficencia: ["ferido", "Ela foi exposta a um risco desnecessário, e o dano aconteceu."],
      justica: ["ferido", "Uma vaga escassa do SUS foi usada sem indicação, enquanto outros pacientes com indicação esperam na fila."]
    }
  },
  {
    titulo: "O diagnóstico escondido",
    tema: "Verdade e paternalismo",
    texto: [
      "Marta, 54 anos, lúcida e professora aposentada, recebe o diagnóstico de câncer de pâncreas. A pedido dos filhos, a equipe combina não contar nada a ela: \"ela é muito sensível, vai sofrer\".",
      "Os filhos decidem o tratamento. Marta pergunta várias vezes por que está tão cansada e ouve que \"é só anemia\". Ela tinha planos de viajar para ver a irmã e de organizar seus documentos."
    ],
    gabarito: {
      autonomia: ["ferido", "Marta é capaz de decidir e perguntou diretamente. Esconder o diagnóstico e deixar os filhos escolherem tira dela o direito de decidir sobre a própria vida."],
      beneficencia: ["ferido", "A intenção era protegê-la, mas isso é paternalismo: o bem dela, como ela mesma o definiria (viajar, organizar a vida), foi deixado de lado."],
      naoMaleficencia: ["ferido", "Mentir quebra a confiança e causa dano: ela perde tempo e escolhas que não voltam."],
      justica: ["foco", "Não há disputa por recursos nem tratamento desigual entre pacientes neste caso."]
    }
  },
  {
    titulo: "Poucas doses de vacina",
    tema: "Distribuição de recursos",
    texto: [
      "Uma unidade básica recebe menos doses de uma vacina nova do que a população precisa. A equipe segue os critérios técnicos do Ministério da Saúde: primeiro idosos, pessoas com doenças crônicas e profissionais de saúde.",
      "Cada pessoa recebe informações sobre benefícios e efeitos colaterais e decide se quer se vacinar. Quem tem dúvidas conversa com a enfermeira. Os efeitos adversos são acompanhados e notificados."
    ],
    gabarito: {
      autonomia: ["respeitado", "A vacinação é oferecida com informação, e cada pessoa decide se aceita."],
      beneficencia: ["respeitado", "As doses vão para quem tem mais a ganhar com a proteção."],
      naoMaleficencia: ["respeitado", "Os riscos são informados e os efeitos adversos são acompanhados e notificados."],
      justica: ["respeitado", "Recursos escassos foram distribuídos por critérios públicos e técnicos, priorizando quem tem maior risco: isso é equidade."]
    }
  },
  {
    titulo: "A pesquisa na comunidade",
    tema: "Ética em pesquisa",
    texto: [
      "Um pesquisador testa um medicamento experimental numa comunidade pobre. Ele oferece R$ 300 a quem participar, valor alto para as famílias do bairro.",
      "O termo de consentimento tem 12 páginas em linguagem técnica e ninguém explica os riscos. Quando alguns participantes passam mal, não há equipe para acompanhar, e o projeto não passou por um Comitê de Ética em Pesquisa."
    ],
    gabarito: {
      autonomia: ["ferido", "Sem explicação compreensível não há consentimento livre e esclarecido; o pagamento alto também pressiona a decisão de quem tem pouco dinheiro."],
      beneficencia: ["ferido", "Os participantes não têm acompanhamento nem garantia de cuidado; a pesquisa não está organizada em favor deles."],
      naoMaleficencia: ["ferido", "Riscos não informados, sem avaliação ética e sem assistência a quem passa mal."],
      justica: ["ferido", "Uma população vulnerável carrega os riscos da pesquisa. No Brasil, a Resolução CNS 466/2012 exige aprovação em Comitê de Ética e permite ressarcir despesas, não pagar pela participação."]
    }
  },
  {
    titulo: "Cuidados no fim da vida",
    tema: "Cuidados paliativos",
    texto: [
      "Seu José, 81 anos, tem insuficiência cardíaca avançada. Lúcido, ele registrou em prontuário suas diretivas antecipadas: não quer ser intubado nem ir para a UTI se o quadro se tornar irreversível.",
      "Quando isso acontece, a equipe conversa com ele e com a família, respeita a decisão e foca em aliviar a falta de ar e a dor, com a família por perto."
    ],
    gabarito: {
      autonomia: ["respeitado", "A vontade dele, expressa com antecedência e de forma lúcida, foi seguida (Resolução CFM 1.995/2012)."],
      beneficencia: ["respeitado", "O cuidado foi direcionado ao conforto e ao que importava para ele."],
      naoMaleficencia: ["respeitado", "Evitou-se a distanásia: procedimentos invasivos que prolongariam o sofrimento sem chance de recuperação."],
      justica: ["foco", "O caso não trata de divisão de recursos nem de desigualdade de acesso."]
    }
  },
  {
    titulo: "A foto no grupo",
    tema: "Sigilo e privacidade",
    texto: [
      "Um cantor conhecido é internado com overdose. Uma técnica de enfermagem tira uma foto dele no leito, com o prontuário aparecendo, e manda no grupo de WhatsApp dos amigos \"só para mostrar\".",
      "Em poucas horas a foto circula nas redes sociais e em sites de fofoca. O paciente descobre ao receber alta."
    ],
    gabarito: {
      autonomia: ["ferido", "Cabe ao paciente decidir quem sabe do seu estado de saúde. A exposição tirou dele esse controle; o sigilo profissional protege exatamente isso."],
      beneficencia: ["foco", "O problema não está no cuidado prestado para tratar a overdose, e sim no que foi feito com a informação dele."],
      naoMaleficencia: ["ferido", "A divulgação causou dano real: exposição pública, estigma e sofrimento. Dados de saúde são dados sensíveis pela LGPD."],
      justica: ["foco", "Não há distribuição de recursos nem desigualdade de acesso em jogo."]
    }
  },
  {
    titulo: "Mutirão sem retorno",
    tema: "Continuidade do cuidado",
    texto: [
      "Uma cidade do interior sem oftalmologista recebe um mutirão de cirurgias de catarata. Os pacientes são escolhidos pela fila da regulação, e cada um recebe explicação sobre a cirurgia e assina o termo depois de tirar dúvidas.",
      "Em dois dias, 200 pessoas são operadas. A equipe vai embora sem organizar consultas de retorno nem colírios para o pós-operatório. Várias pessoas têm infecção nos olhos e duas perdem a visão de um lado."
    ],
    gabarito: {
      autonomia: ["respeitado", "Cada paciente foi informado, tirou dúvidas e decidiu se aceitava a cirurgia."],
      beneficencia: ["ferido", "Fazer o bem inclui o cuidado completo. Sem retorno e sem colírios, o benefício da cirurgia ficou pela metade."],
      naoMaleficencia: ["ferido", "A falta de acompanhamento previsível causou infecções e perda de visão."],
      justica: ["respeitado", "Levar a cirurgia a uma região sem especialista, seguindo a fila da regulação, amplia o acesso com critério justo."]
    }
  },
  {
    titulo: "Alta para liberar o leito",
    tema: "Recursos e discriminação",
    texto: [
      "Dona Rita, atendida pelo SUS num hospital que também atende convênios, ainda está com febre e pressão instável. A administração pede a alta dela para liberar o leito a um paciente de convênio que vai fazer uma cirurgia programada.",
      "O médico assina a alta. Dois dias depois, Dona Rita volta pela emergência em estado grave."
    ],
    gabarito: {
      autonomia: ["foco", "O centro do caso não é uma escolha de Dona Rita sendo desrespeitada, e sim o critério usado para tirar o leito dela."],
      beneficencia: ["ferido", "A alta não foi dada no interesse da paciente: ela ainda precisava de internação."],
      naoMaleficencia: ["ferido", "A alta precoce a expôs a um risco previsível, e ela piorou."],
      justica: ["ferido", "O leito foi decidido por quem paga, não por quem precisa. Para casos clínicos parecidos, o tipo de cobertura não pode decidir quem fica."]
    }
  },
  {
    titulo: "Atendimento na aldeia",
    tema: "Diversidade cultural",
    texto: [
      "Seu Karai, indígena guarani de 70 anos, chega ao hospital com pneumonia e fala pouco português. A equipe chama um intérprete do distrito sanitário indígena e explica o diagnóstico e o tratamento na língua dele.",
      "Ele aceita o antibiótico e pede que o pajé da aldeia possa visitá-lo para um ritual de cura. A equipe permite a visita, combina horários que não atrapalham a medicação e acompanha a evolução até a alta."
    ],
    gabarito: {
      autonomia: ["respeitado", "Com intérprete, ele entendeu a situação e decidiu sobre o tratamento; suas práticas culturais também foram respeitadas."],
      beneficencia: ["respeitado", "A equipe tratou a pneumonia e também cuidou do que importava para ele."],
      naoMaleficencia: ["respeitado", "O ritual foi conciliado com o tratamento, sem interromper a medicação, e a evolução foi acompanhada."],
      justica: ["respeitado", "Equidade inclui adaptar o atendimento para quem tem barreiras de língua e cultura, garantindo o mesmo acesso ao cuidado."]
    }
  },
  {
    titulo: "O exame admissional",
    tema: "Consentimento e discriminação",
    texto: [
      "Para contratar uma nova funcionária, uma empresa pede exames de sangue. Sem avisar, o laboratório da empresa inclui um teste de HIV. O resultado dá positivo e o médico do trabalho comunica ao setor de recursos humanos.",
      "A candidata não é contratada e só descobre o diagnóstico semanas depois, por um colega que ouviu comentários na empresa."
    ],
    gabarito: {
      autonomia: ["ferido", "O teste foi feito sem o conhecimento nem o consentimento dela, e ela nem recebeu o próprio resultado de forma adequada."],
      beneficencia: ["foco", "O exame não foi feito para cuidar dela; o centro do caso é o teste sem consentimento, a quebra de sigilo e a discriminação."],
      naoMaleficencia: ["ferido", "Ela perdeu o emprego, teve o diagnóstico exposto e o descobriu da pior forma."],
      justica: ["ferido", "Ela foi excluída por causa do HIV. No Brasil, a Portaria MTE 1.246/2010 proíbe testar HIV em exames admissionais, e a Lei 12.984/2014 tornou crime discriminar pessoas que vivem com HIV."]
    }
  },
  {
    titulo: "Mãos não lavadas",
    tema: "Segurança do paciente",
    texto: [
      "Numa enfermaria cheia, um técnico de enfermagem cuida de oito pacientes. Para ganhar tempo, ele deixa de higienizar as mãos entre um paciente e outro ao trocar curativos.",
      "Em uma semana, quatro pacientes da enfermaria têm infecção pela mesma bactéria resistente, e um deles vai para a UTI."
    ],
    gabarito: {
      autonomia: ["foco", "Não há decisão de paciente sendo ignorada; o problema está na prática do profissional."],
      beneficencia: ["ferido", "Cuidar bem inclui as medidas básicas de segurança; pular a higiene das mãos vai contra o interesse dos pacientes."],
      naoMaleficencia: ["ferido", "A falha causou dano direto e evitável: infecções e uma internação em UTI."],
      justica: ["foco", "O caso não trata de distribuição de recursos. A sobrecarga de trabalho pode ser debatida, mas o centro é o dano evitável."]
    }
  }
];
