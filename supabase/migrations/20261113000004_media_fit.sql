-- Come mostrare una foto nei riquadri: "cover" riempie (foto con sfondo pieno),
-- "contain" la contiene (render scontornati). Aggiunto con le foto del 13/11/2026.
alter table public.media add column fit text not null default 'contain' check (fit in ('cover', 'contain'));
