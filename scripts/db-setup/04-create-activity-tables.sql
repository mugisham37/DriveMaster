
$;ENDdata';
d_eanup_expirecln, rtitioonthly_pate_mons: creanctiated fuNOTICE 'CreRAISE    
 ics';yt_analtivityiew: aced veat NOTICE 'Cr;
    RAISEies_2025'er_activit024, usvities_2tiacser_ urtitions:ted paTICE 'CreaNO   RAISE ';
 mendationsvity_recom actinsights,ctivity_i as,itie: user_activ tablesE 'CreatedSE NOTIC  RAIW();
   NOly at %', successfulles createdking tabty tracE 'ActiviICISE NOT  RAN
  O $
BEGIion
Dreatessful csuccLog - ;

-ly_roles TO readonlyticactivity_anaSELECT ON NT p_role;
GRAapytics TO alctivity_anECT ON aT SELRAN
Giewe vto thant access e;

-- Gry_cod.countr uid, u.email,Y u.E
GROUP Bctive = TRUu.is_a_id
WHERE ua.userON u.id =  ua esser_activitiFT JOIN us u
LE usericed
FROMopics_pract) as tua.topic_idCT T(DISTIN  COUNts,
  al_attempND) as tot THEN 1 Et'mpt_submi= 'atteivity_type .actE WHEN uaT(CASOUN,
    Cation_msdur) as avg_n_msua.duratio AVG(
   y,ivitlast_acts mp) aX(ua.timesta   MA
 tivity,t_acamp) as firs(ua.timest   MINdays,
 ctive_amp)) as aesttimT DATE(ua.STINC COUNT(DIons,
   otal_sessi) as tion_id.sessTINCT ua  COUNT(DISties,
  otal_activid) as t(ua.iOUNT  C,
  ountry_code,
    u.cmail    u.eid,
 as user_
    u.idSELECT ytics AS
ctivity_anal VIEW aREPLACETE OR ytics
CREAvity analiew for actia veate -- Crql;

UAGE plpgs$ LANGEND;
', NOW();
s at %ion recommendat andsightsctivity inpired aned up exOTICE 'CleaISE Nnup
    RAg clea
    -- LoW();
    es_at < NOxpirAND eNOT NULL es_at IS RE expirWHEions 
    ommendatty_recactiviFROM    DELETE ations
 recommend up expired an-- Cle
       < NOW();
 es_at irD exp NOT NULL ANs_at ISHERE expireghts 
    Wsiactivity_inFROM  DELETE s
   ed insight expir-- Clean up    
BEGIN
AS $NS VOID ta()
RETUR_expired_daON cleanupFUNCTIREPLACE TE OR ations
CREAndommend recs a insightired up exp cleanction toreate fun- Clpgsql;

- LANGUAGE p);
END;
$end_datestart_date, ble_name,  taame,rtition_n    pa            
   L)', (%(%L) TO FROM  VALUESF %I FORTITION OPARS %I T EXISTBLE IF NOTE TArmat('CREAECUTE fo   EX';
    
 VAL '1 month + INTERstart_dateend_date := M');
    'YYYY_Mtart_date, | to_char(sme || '_' |:= table_naon_name iti    part
BEGIN
_date DATE;  end
  ame TEXT; partition_n   LARE

DECOID AS $)
RETURNS VDATEt_date T, starle_name TEXtabartition(hly_pnt_moON createUNCTI FLACEEATE OR REPrtitions
CR paonthlye mly creatutomaticaltion to a Create funce;

--donly_rols TO reaendationcomm_reactivityN  OT SELECTRANnly_role;
Ghts TO readoity_insig activELECT ONGRANT Sole;
ly_ron TO readr_activities ON useELECT SANTle;

GRpp_ro aons TOtidaecommenty_r ON activiE, DELETEATNSERT, UPDELECT, I
GRANT Sp_role;ts TO apity_insigh activELETE ON D, UPDATE,NSERTSELECT, Iole;
GRANT es TO app_rtivitier_acus DELETE ON RT, UPDATE,ECT, INSERANT SELs
Gn roleapplicatioons to siGrant permisL;

-- t IS NOT NULires_aERE expt) WHes_aons(expirdatienivity_recommactat ON ires_dations_expommenivity_recSTS idx_act IF NOT EXI INDEXEATEpplied);
CRions(aecommendatvity_ried ON actins_applioatrecommendvity_x_acti idNOT EXISTSTE INDEX IF 
CREAt DESC);_a(generatedommendationsctivity_rec ated_at ONgeneramendations_ty_recomiviTS idx_actT EXISEX IF NOCREATE INDity DESC);
priortions(ommendaivity_rec ON actprioritymmendations_vity_recoactiS idx_ISTX IF NOT EXINDE);
CREATE ategoryions(crecommendaty_vitgory ON actidations_catey_recommenactivit idx_F NOT EXISTSEATE INDEX I
CRype);tions(tnday_recommevitype ON actidations_t_recommenivityTS idx_act IF NOT EXISE INDEX
CREAT);s(user_idmmendationy_recoON activit_user_id ommendationsactivity_recXISTS idx_IF NOT EX 
CREATE INDEindexestions  recommenda
-- ActivityNOT NULL;
s_at IS ERE expirees_at) WHsights(expir activity_inpires_at ON_exty_insightsidx_activiNOT EXISTS  IF TE INDEXC);
CREAted_at DESights(generaty_insctivi a_at ONtedights_genera_insvitytiidx_ac NOT EXISTS  IFNDEX IEATE;
CRty)rihts(sevevity_insigty ON actis_severiinsightctivity_XISTS idx_aF NOT E INDEX IEATE
CRory);ghts(categsiity_inON activgory te_insights_caivityx_actS idISTX IF NOT EX
CREATE INDEts(type);vity_insighctie ON ansights_typty_i idx_activi EXISTSIF NOTTE INDEX _id);
CREAerights(usinsON activity_id ser_sights_u_activity_inT EXISTS idxEX IF NOATE INDes
CREdexsights inActivity in-- ed_at);

ties(creater_activiN uscreated_at Oities_ctivser_aTS idx_u EXIS NOTEX IFCREATE IND
atform);ivities(plN user_act Oformties_platser_activiEXISTS idx_uNDEX IF NOT EATE I
CR;vice_type)es(deivitir_act_type ON useies_deviceactivitS idx_user_OT EXISTDEX IF NREATE IN
Camp DESC); timestes(user_id,ctivitiser_a ump ONmestaer_tictivities_us_user_aEXISTS idx NOT  IFEATE INDEXp DESC);
CRs(timestamvitie user_actiONstamp _timeiesr_activituse EXISTS idx_F NOTATE INDEX I_id);
CREs(topictieactivi user_pic_id ONities_toer_activx_usT EXISTS idNOTE INDEX IF _id);
CREAies(itemr_activitsem_id ON uies_iteitctividx_user_a EXISTS NOTX IF  INDE);
CREATEssion_idctivities(seN user_assion_id Os_seitietiv_user_acISTS idxT EX INDEX IF NOpe);
CREATEtivity_ty(actiesvicti user_aype ONtivity_t_acitiesactivuser_dx_ISTS iOT EXDEX IF N
CREATE INs(user_id);er_activitieN usd Oser_iactivities_uer_TS idx_usIF NOT EXISNDEX ATE IRExes
Cndetivities i-- User acormance
r perfndexes fo- Create i;

-
)= 10)D priority < 1 ANpriority >=rity CHECK (lid_prioINT vaTRACONS    onstraints
 -- C

   IMESTAMPTZ,applied_at T   
 ,SET FALDEFAULAN OOLE   applied BTAMPTZ,
 TIMESat s_pire
    exNOW(),T Z DEFAULIMESTAMPTd_at Tgenerate[]',
    FAULT ' JSONB DE  actions,
  ULT '{}'JSONB DEFA  metadata NULL,
  (100) NOT gory VARCHAR   cate 10),
 y <=oritpri>= 1 AND iority CHECK (prLL T NUR NOy INTEGE
    prioritT NULL,tion TEXT NOrip    desc,
) NOT NULLHAR(255VARCtle    tiOT NULL,
 AR(100) Npe VARCH,
    tySCADEON DELETE CA users(id) ERENCES NULL REF UUID NOTuser_id  RY KEY,
  IMACHAR(255) PR
    id VARs (mmendation_recoivitySTS actNOT EXITE TABLE IF CREAons table
endati recommtivity Ac
--

);critical'))warning', ', 'info'IN ('K (severity verity CHECd_seAINT vali CONSTR
   tstrain- Cons,

    -ESTAMPTZTIMat   expires_OW(),
  ULT NTAMPTZ DEFAed_at TIMES  generat,
  EFAULT '[]'ems JSONB D   action_it'{}',
 B DEFAULT a JSONdattaL,
    meUL0) NOT NARCHAR(10gory V    cate),
cal') 'critiwarning',, 'IN ('info'K (severity CHECOT NULL AR(50) Nty VARCHrive
    se,NULLT NOT ription TEX descT NULL,
   NOAR(255) RCHVAtle tiL,
    100) NOT NULHAR(e VARC  typ,
   CASCADEON DELETEusers(id) S ERENCEOT NULL REF UUID Ner_id us  MARY KEY,
 ) PRI255d VARCHAR(s (
    insight activity_i EXISTSLE IF NOTREATE TABtable
Cinsights ivity 

-- Act);-01-01'TO ('202601') ('2025-01-FROM FOR VALUES ties
    _activiOF userON TITI_2025 PAR_activitiesXISTS user IF NOT EREATE TABLE
C2025 for re partition Create futu');

--25-01-01) TO ('20'2024-01-01'OM (R VALUES FRties
    FOiviOF user_act4 PARTITION vities_202_actiS userT EXISTE IF NOABL
CREATE Teities tabler_activfor ustion itial parti Create in
--ed_at);
GE (creatON BY RANARTITI >= 0)
) P duration_mss IS NULL ORduration_mtion CHECK (alid_duraT vRAIN   CONSTs
 nstraint Co,

    --ULT NOW()PTZ DEFAt TIMESTAMd_aeateW(),
    crZ DEFAULT NOTIMESTAMPTtamp    timesGINT,
 ration_ms BI duon
   ting informa Timi    -- INET,

_address    ip TEXT,
genter_a
    us0),(5m VARCHARlatfor
    p50),AR(ion VARCHpp_vers(50),
    aype VARCHARice_tion
    devormatext inf Cont',

    --DEFAULT '{}SONB metadata Jta
    tadativity meAc
    -- AR(100),
pic_id VARCHULL,
    to SET NDELETE ON s(id)itemENCES ID REFER item_id UU
   ID,_id UUsession NULL,
    OTity_type Ntivty_type activi acE,
   CASCADLETE ON DEusers(id) FERENCES L RE NULd UUID NOTr_i usee_v4(),
   enerat uuid_gEFAULTY DPRIMARY KEid UUID    ies (
 user_activitOT EXISTS  IF NTABLE)
CREATE scalabilityr y date fooned biti(parte es tabler activiti

-- Us;
END $$;HEN nullt Ticate_objecduplN 
    WHETION);
EXCEP    ormance'
perf, 'r''erroback', ew', 'feed 'revi',
       bookmarkokmark', 'un'share', 'boort', er', 'exprch', 'filtdate', 'seaprofile_up    '  
  date',s_upting 'set_view',progressn_view', 'xplanatio'est', hint_requent_view', 'onte  'c      ion_end',
sesstart', 'sion_smit', 'sesempt_subtt_start', 'atemptut', 'at'logologin',       '  M (
e AS ENUctivity_typATE TYPE aIN
    CREDO $$ BEGenum
ype  activity t- Create";

--osspuuidEXISTS "T  IF NOIONEATE EXTENSled
CRy enabalread not on ifensible UUID exts

-- Enaticd analy tracking aner activityes for uscessary tablthe neipt creates cr
-- This ser Servicebles for Uscking taraivity t-- Act