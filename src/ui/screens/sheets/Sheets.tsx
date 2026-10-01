'use client';

/**
 * Bottom sheets — mobile-first panels: property card, assets manager,
 * trade builder/viewer, auction room, card reveal, game log.
 */
import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../state/gameStore';
import { audio } from '../../../audio/audioEngine';
import { t, useLang } from '../../../i18n';
import { BOARD, DISTRICTS, CARDS_BY_ID, SPACE_ART } from '../../../data/board';
import { Landmark } from '../../../art/board/Landmark';
import { CharacterPortrait } from '../../../art/characters/Characters';
import { HouseIcon, HotelIcon, Bill, CardBack } from '../../../art/props/Props';
import type { TradeOffer } from '../../../engines/types';

// ─── shell ──────────────────────────────────────────────────────────────────

export function BoardSheet({ children, label }: { children: ReactNode; label?: string }): ReactNode {
  const openSheet = useGameStore((s) => s.openSheet);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-black/40" onClick={() => openSheet(null)} />
      <motion.div
        className="ec-sheet ec-scroll relative max-h-[86dvh] w-full max-w-md overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      >
        <div className="ec-grabber" />
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── property card ──────────────────────────────────────────────────────────

export function PropertySheet({ spaceId }: { spaceId: number }): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const openSheet = useGameStore((s) => s.openSheet);
  if (!state) return null;

  const data = BOARD[spaceId];
  const ss = state.spaces[spaceId];
  const district = data.district ? DISTRICTS[data.district] : null;
  const owner = ss.ownerId ? state.players.find((p) => p.id === ss.ownerId) : null;
  const me = state.players.find((p) => p.id === localPlayerId)!;
  const isMine = ss.ownerId === me.id;
  const canManage = isMine && ['awaiting-end', 'debt'].includes(state.phase);

  return (
    <div className="p-4 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">{t(data.name)}</h2>
        <button className="ec-btn ec-btn-sheet min-h-9 px-3 text-xs" onClick={() => openSheet(null)}>{t('common.close')}</button>
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl shadow-md">
        <Landmark artKey={SPACE_ART[spaceId]} district={data.district} theme={state.settings.theme} size="100%" label={t(data.name)} />
      </div>
      {district && (
        <div className="px-3 py-1.5 text-center text-xs font-black uppercase tracking-wider text-white" style={{ background: district.banner, borderRadius: 8, marginTop: -14, position: 'relative', margin: '-14px auto 0', width: '70%' }}>
          {t(district.nameKey)}
        </div>
      )}

      {(() => {
        const rent = data.rent;
        if (data.type !== 'street' || !rent) return null;
        return (
          <table className="mt-3 w-full text-sm">
            <tbody>
              <Row label={t('sheet.rent')} value={`$${rent[0]}`} />
              {[1, 2, 3, 4].map((h) => (
                <Row key={h} label={t('sheet.rentWith', { n: h, s: h > 1 ? 's' : '' })} value={`$${rent[h]}`} dim={ss.houses !== h} />
              ))}
              <Row label={t('sheet.rentHotel')} value={`$${rent[5]}`} dim={ss.houses !== 5} />
              <Row label={t('sheet.houseCost')} value={`$${data.houseCost}`} />
              <Row label={t('sheet.mortgage')} value={`$${data.mortgageValue}`} />
            </tbody>
          </table>
        );
      })()}
      {(data.type === 'station' || data.type === 'utility') && (
        <div className="mt-3 rounded-xl bg-[var(--ec-surface)] p-3 text-sm shadow-sm">
          <p className="font-bold">{data.type === 'station'
            ? '$25 / $50 / $100 / $200 — by stations owned'
            : '4× dice roll (10× with both utilities)'}</p>
          <p className="mt-1 text-xs text-[var(--ec-ink-soft)]">{t('sheet.mortgage')}: ${data.mortgageValue}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--ec-surface)] p-2.5 shadow-sm">
        {owner ? (
          <>
            <CharacterPortrait characterId={owner.characterId} emotion={owner.id === localPlayerId ? 'happy' : 'idle'} size={36} />
            <div>
              <div className="text-xs font-bold text-[var(--ec-ink-soft)]">{t('sheet.owner')}</div>
              <div className="text-sm font-black">{owner.name}{owner.id === localPlayerId && owner.name !== t('common.you') ? ` (${t('common.you')})` : ''}</div>
            </div>
            {ss.mortgaged && <span className="ec-chip ml-auto text-[var(--ec-bad)]">{t('sheet.mortgaged')}</span>}
          </>
        ) : (
          <div className="w-full text-sm font-bold text-[var(--ec-ink-soft)]">
            {data.price ? `${t('sheet.unowned')} · $${data.price}` : t(data.name)}
          </div>
        )}
      </div>

      {district && owner && <p className="mt-2 text-center text-xs font-semibold text-[var(--ec-gold)]">✦ {t('sheet.monopoly')}</p>}

      {canManage && data.type === 'street' && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="ec-btn ec-btn-good" onClick={() => dispatch({ type: 'BUILD_HOUSE', playerId: me.id, spaceId })} disabled={ss.houses >= 5}>
            {ss.houses === 4 ? <HotelIcon size={16} /> : <HouseIcon size={16} />} {ss.houses === 4 ? 'Hotel' : t('sheet.buildHouse')}
          </button>
          <button className="ec-btn ec-btn-sheet" onClick={() => dispatch({ type: 'SELL_HOUSE', playerId: me.id, spaceId })} disabled={ss.houses === 0}>
            {t('sheet.sellHouse')}
          </button>
          {!ss.mortgaged ? (
            <button className="ec-btn ec-btn-sheet col-span-2" onClick={() => dispatch({ type: 'MORTGAGE', playerId: me.id, spaceId })}>
              {t('sheet.mortgageBtn')} (+${data.mortgageValue})
            </button>
          ) : (
            <button className="ec-btn ec-btn-gold col-span-2" onClick={() => dispatch({ type: 'UNMORTGAGE', playerId: me.id, spaceId })}>
              {t('sheet.unmortgageBtn')} (−${(data.mortgageValue ?? 0) + Math.ceil((data.mortgageValue ?? 0) / 10)})
            </button>
          )}
        </div>
      )}
      {canManage && (data.type === 'station' || data.type === 'utility') && (
        <div className="mt-4">
          {!ss.mortgaged ? (
            <button className="ec-btn ec-btn-sheet w-full" onClick={() => dispatch({ type: 'MORTGAGE', playerId: me.id, spaceId })}>
              {t('sheet.mortgageBtn')} (+${data.mortgageValue})
            </button>
          ) : (
            <button className="ec-btn ec-btn-gold w-full" onClick={() => dispatch({ type: 'UNMORTGAGE', playerId: me.id, spaceId })}>
              {t('sheet.unmortgageBtn')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }): ReactNode {
  return (
    <tr className={dim ? 'opacity-50' : ''}>
      <td className="py-1 text-[var(--ec-ink-soft)]">{label}</td>
      <td className="py-1 text-right font-bold">{value}</td>
    </tr>
  );
}

// ─── assets manager ─────────────────────────────────────────────────────────

export function AssetsSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const openSheet = useGameStore((s) => s.openSheet);
  const selectSpace = useGameStore((s) => s.selectSpace);
  if (!state) return null;
  const me = state.players.find((p) => p.id === localPlayerId)!;

  const owned = state.spaces
    .map((ss, i) => ({ ss, i }))
    .filter(({ ss }) => ss.ownerId === me.id);

  const netWorth = me.cash + owned.reduce((acc, { ss, i }) => {
    const d = BOARD[i];
    return acc + (ss.mortgaged ? 0 : (d.mortgageValue ?? 0)) + (d.type === 'street' ? (ss.houses === 5 ? 5 : ss.houses) * Math.floor((d.houseCost ?? 0) / 2) : 0);
  }, 0);

  return (
    <div className="p-4 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">{t('sheet.assets.title')}</h2>
        <button className="ec-btn ec-btn-sheet min-h-9 px-3 text-xs" onClick={() => openSheet(null)}>{t('common.close')}</button>
      </div>
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F2B33D22] to-transparent p-3">
        <div>
          <div className="text-xs font-bold text-[var(--ec-ink-soft)]">{t('common.cash')}</div>
          <div className="text-xl font-black">${me.cash.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[var(--ec-ink-soft)]">{t('sheet.netWorth')}</div>
          <div className="text-xl font-black text-[var(--ec-good)]">${netWorth.toLocaleString()}</div>
        </div>
      </div>

      {me.getOutOfJailCards > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--ec-surface)] p-2 shadow-sm">
          <JailFreeCardImage />
          <span className="text-sm font-bold">×{me.getOutOfJailCards}</span>
        </div>
      )}

      {owned.length === 0 && <p className="py-6 text-center text-sm font-semibold text-[var(--ec-ink-soft)]">{t('sheet.assets.none')}</p>}

      <div className="space-y-2">
        {owned.map(({ ss, i }) => {
          const d = BOARD[i];
          const district = d.district ? DISTRICTS[d.district] : null;
          return (
            <div key={i} className="flex items-center gap-2 rounded-2xl bg-[var(--ec-surface)] p-2 shadow-sm">
              <button
                className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl"
                onClick={() => { selectSpace(i); openSheet('property'); }}
                aria-label={t(d.name)}
              >
                <Landmark artKey={SPACE_ART[i]} district={d.district} theme={state.settings.theme} size="100%" label="" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black">{t(d.name)}</div>
                <div className="flex items-center gap-1 text-xs font-bold text-[var(--ec-ink-soft)]">
                  {district && <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: district.banner }} />}
                  <span className="truncate">{ss.mortgaged ? t('sheet.mortgaged') : d.type === 'street' && d.rent ? `$${d.rent[Math.min(ss.houses, 5)]} ${t('sheet.rent').toLowerCase()}` : `$${d.price}`}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {ss.houses > 0 && ss.houses < 5 && Array.from({ length: ss.houses }, (_, k) => <HouseIcon key={k} size={12} />)}
                {ss.houses === 5 && <HotelIcon size={16} />}
              </div>
              <div className="flex flex-col gap-1">
                {d.type === 'street' && (
                  <>
                    <button className="ec-btn ec-btn-sheet min-h-8 !px-2.5 text-xs" aria-label="build" onClick={() => dispatch({ type: 'BUILD_HOUSE', playerId: me.id, spaceId: i })}>＋</button>
                    <button className="ec-btn ec-btn-sheet min-h-8 !px-2.5 text-xs" aria-label="sell" onClick={() => dispatch({ type: 'SELL_HOUSE', playerId: me.id, spaceId: i })}>−</button>
                  </>
                )}
              </div>
              <button
                className="ec-btn ec-btn-sheet min-h-8 !px-2 text-[10px] font-black"
                aria-label={ss.mortgaged ? 'unmortgage' : 'mortgage'}
                onClick={() => dispatch({ type: ss.mortgaged ? 'UNMORTGAGE' : 'MORTGAGE', playerId: me.id, spaceId: i })}
              >
                {ss.mortgaged ? '↑' : 'M'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JailFreeCardImage(): ReactNode {
  return (
    <svg viewBox="0 0 60 40" width={44} height={30} role="img" aria-label="Jail free card">
      <rect x={1} y={1} width={58} height={38} rx={5} fill="#F2B33D" stroke="#C08A1E" strokeWidth={1.4} />
      <path d="M 30 10 l 2.6 6 6.4 0.6 -4.8 4.4 1.4 6.4 -5.6 -3.4 -5.6 3.4 1.4 -6.4 -4.8 -4.4 6.4 -0.6 z" fill="#7C3A10" opacity={0.85} />
    </svg>
  );
}

// ─── trade builder ──────────────────────────────────────────────────────────

export function TradeBuilderSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const openSheet = useGameStore((s) => s.openSheet);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [giveCash, setGiveCash] = useState(0);
  const [getCash, setGetCash] = useState(0);
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);

  if (!state) return null;
  const me = state.players.find((p) => p.id === localPlayerId)!;
  const others = state.players.filter((p) => p.id !== me.id && !p.bankrupt);

  const myProps = state.spaces.map((ss, i) => ({ ss, i })).filter(({ ss, i }) => ss.ownerId === me.id && !(BOARD[i].type === 'street' && ss.houses > 0));
  const target = others.find((p) => p.id === targetId);
  const theirProps = target ? state.spaces.map((ss, i) => ({ ss, i })).filter(({ ss }) => ss.ownerId === target.id) : [];

  const propose = () => {
    if (!target) return;
    const offer: TradeOffer = {
      fromId: me.id, toId: target.id,
      giveCash, getCash, giveProperties: giveProps, getProperties: getProps,
      giveJailCards: 0, getJailCards: 0,
    };
    dispatch({ type: 'PROPOSE_TRADE', playerId: me.id, offer });
    openSheet(null);
  };

  const valid = target && (giveCash > 0 || getCash > 0 || giveProps.length > 0 || getProps.length > 0);

  return (
    <div className="p-4 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">🤝 {t('sheet.trade.title')}</h2>
        <button className="ec-btn ec-btn-sheet min-h-9 px-3 text-xs" onClick={() => openSheet(null)}>{t('common.close')}</button>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto ec-scroll pb-1">
        {others.map((p) => (
          <button
            key={p.id}
            onClick={() => { audio.play('click'); setTargetId(p.id); }}
            className={`flex shrink-0 flex-col items-center rounded-2xl p-1.5 ${targetId === p.id ? 'bg-[var(--ec-surface)] ring-2 ring-[var(--ec-brand)]' : 'opacity-70'}`}
          >
            <CharacterPortrait characterId={p.characterId} emotion="thinking" size={40} />
            <span className="max-w-[56px] truncate text-[10px] font-bold">{p.name}</span>
          </button>
        ))}
      </div>

      {target && (
        <div className="grid grid-cols-2 gap-2.5">
          <TradeColumn
            title={t('sheet.trade.youGive')}
            cash={giveCash} setCash={setGiveCash} maxCash={me.cash}
            props={myProps} selected={giveProps} setSelected={setGiveProps}
          />
          <TradeColumn
            title={t('sheet.trade.youGet')}
            cash={getCash} setCash={setGetCash} maxCash={target.cash}
            props={theirProps} selected={getProps} setSelected={setGetProps}
          />
        </div>
      )}

      <button className="ec-btn ec-btn-primary mt-4 w-full" disabled={!valid} onClick={propose}>
        {t('sheet.trade.propose')}
      </button>
    </div>
  );
}

function TradeColumn({ title, cash, setCash, maxCash, props, selected, setSelected }: {
  title: string;
  cash: number; setCash: (v: number) => void; maxCash: number;
  props: { ss: { mortgaged: boolean }; i: number }[];
  selected: number[]; setSelected: (v: number[]) => void;
}): ReactNode {
  const toggle = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    audio.play('click');
  };
  return (
    <div className="rounded-2xl bg-[var(--ec-surface)] p-2.5 shadow-sm">
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-wide text-[var(--ec-ink-soft)]">{title}</h3>
      <div className="mb-2 flex items-center gap-1.5">
        <Bill value={100} size={20} />
        <input
          type="number" min={0} max={maxCash} value={cash || ''}
          placeholder="0" aria-label={`${title} cash`}
          onChange={(e) => setCash(Math.min(maxCash, Math.max(0, Number(e.target.value) || 0)))}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--focus)]"
        />
      </div>
      <div className="ec-scroll max-h-44 space-y-1 overflow-y-auto">
        {props.map(({ i }) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`flex w-full items-center gap-1.5 rounded-lg p-1.5 text-left text-xs font-bold ${selected.includes(i) ? 'bg-[var(--ec-good)]/15 ring-1 ring-[var(--ec-good)]' : 'bg-black/5'}`}
          >
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: BOARD[i].district ? DISTRICTS[BOARD[i].district].banner : '#9AA5B1' }} />
            <span className="truncate">{t(BOARD[i].name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── incoming trade ─────────────────────────────────────────────────────────

export function TradeSheet(): ReactNode {
  return <TradeBuilderSheet />;
}

export function IncomingTradeSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  if (!state?.pendingTrade) return null;
  const { offer } = state.pendingTrade;
  const from = state.players.find((p) => p.id === offer.fromId)!;
  const amTarget = offer.toId === localPlayerId;

  return (
    <div className="p-4 pb-8">
      <h2 className="mb-1 text-lg font-black">{t('sheet.trade.incoming')}</h2>
      <div className="mb-3 flex items-center gap-2">
        <CharacterPortrait characterId={from.characterId} emotion="thinking" size={44} />
        <div className="text-sm font-bold">{from.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-[var(--ec-surface)] p-2.5 shadow-sm">
          <h3 className="mb-1 text-xs font-black uppercase text-[var(--ec-ink-soft)]">{t('sheet.trade.youGet')}</h3>
          <p className="font-bold">${offer.giveCash}</p>
          {offer.giveProperties.map((id) => <p key={id} className="truncate font-bold">· {t(BOARD[id].name)}</p>)}
          {offer.giveJailCards > 0 && <p className="font-bold">🎟️ ×{offer.giveJailCards}</p>}
        </div>
        <div className="rounded-2xl bg-[var(--ec-surface)] p-2.5 shadow-sm">
          <h3 className="mb-1 text-xs font-black uppercase text-[var(--ec-ink-soft)]">{t('sheet.trade.youGive')}</h3>
          <p className="font-bold">${offer.getCash}</p>
          {offer.getProperties.map((id) => <p key={id} className="truncate font-bold">· {t(BOARD[id].name)}</p>)}
          {offer.getJailCards > 0 && <p className="font-bold">🎟️ ×{offer.getJailCards}</p>}
        </div>
      </div>
      {amTarget ? (
        <div className="mt-4 flex gap-2">
          <button className="ec-btn ec-btn-good flex-1" onClick={() => dispatch({ type: 'ACCEPT_TRADE', playerId: localPlayerId })}>{t('sheet.trade.accept')}</button>
          <button className="ec-btn ec-btn-bad flex-1" onClick={() => dispatch({ type: 'DECLINE_TRADE', playerId: localPlayerId })}>{t('sheet.trade.decline')}</button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm font-semibold text-[var(--ec-ink-soft)]">
          {t('game.waiting', { name: state.players.find((p) => p.id === offer.toId)?.name ?? '' })}
        </p>
      )}
    </div>
  );
}

// ─── auction ────────────────────────────────────────────────────────────────

export function AuctionSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const [customBid, setCustomBid] = useState('');
  const a = state?.pendingAuction;
  if (!state || !a) return null;

  const data = BOARD[a.spaceId];
  const highBidder = a.highestBidderId ? state.players.find((p) => p.id === a.highestBidderId) : null;
  const me = state.players.find((p) => p.id === localPlayerId)!;
  const myTurn = a.activePlayerId === me.id && !a.passed.includes(me.id);
  const activePlayer = a.activePlayerId ? state.players.find((p) => p.id === a.activePlayerId) : null;
  const nextStep = Math.max(10, Math.ceil((a.currentBid + 1) / 10) * 10);

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-black">🔨 {t('sheet.auction.title')}</h2>
      <p className="mb-2 text-sm font-bold text-[var(--ec-ink-soft)]">{t('sheet.auction.for', { name: t(data.name) })}</p>

      <div className="relative mb-3 h-28 overflow-hidden rounded-2xl">
        <Landmark artKey={SPACE_ART[a.spaceId]} district={data.district} theme={state.settings.theme} size="100%" label={t(data.name)} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1 text-sm font-black text-white">${data.price}</span>
      </div>

      <div className="mb-3 rounded-2xl bg-[var(--ec-surface)] p-3 text-center shadow-sm">
        {a.currentBid > 0 ? (
          <p className="text-lg font-black">
            {t('sheet.auction.highBid', { amount: a.currentBid, name: highBidder?.name ?? '' })}
          </p>
        ) : (
          <p className="text-sm font-bold text-[var(--ec-ink-soft)]">{t('sheet.auction.noBids')}</p>
        )}
        <p className="mt-1 text-xs font-bold text-[var(--ec-ink-soft)]">
          {myTurn ? t('sheet.auction.yourTurn') : t('sheet.auction.turn', { name: activePlayer?.name ?? '' })}
        </p>
      </div>

      {myTurn ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[...new Set([nextStep, nextStep + 50, nextStep + 100])]
              .filter((v) => v <= me.cash && v > a.currentBid).slice(0, 3).map((v) => (
                <button key={v} className="ec-btn ec-btn-gold !min-h-11 text-sm" onClick={() => { dispatch({ type: 'BID', playerId: me.id, amount: v }); setCustomBid(''); }}>
                  ${v}
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number" value={customBid} onChange={(e) => setCustomBid(e.target.value)}
              placeholder={`${nextStep}+`} aria-label="Custom bid"
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
            <button
              className="ec-btn ec-btn-primary"
              disabled={!customBid || Number(customBid) <= a.currentBid || Number(customBid) > me.cash}
              onClick={() => { dispatch({ type: 'BID', playerId: me.id, amount: Math.floor(Number(customBid)) }); setCustomBid(''); }}
            >
              OK
            </button>
          </div>
          <button className="ec-btn ec-btn-ghost w-full" onClick={() => dispatch({ type: 'PASS_BID', playerId: me.id })}>
            {t('sheet.auction.pass')}
          </button>
        </div>
      ) : (
        <p className="py-3 text-center text-sm font-bold text-[var(--ec-ink-soft)]">…</p>
      )}

      <div className="mt-3 flex justify-center gap-2">
        {state.players.filter((p) => !p.bankrupt).map((p) => (
          <div key={p.id} className={`flex flex-col items-center rounded-xl p-1 ${a.passed.includes(p.id) ? 'opacity-30' : ''}`}>
            <CharacterPortrait characterId={p.characterId} emotion={a.highestBidderId === p.id ? 'happy' : 'idle'} size={30} />
            <span className="text-[9px] font-bold">{a.bids[p.id] ? `$${a.bids[p.id]}` : a.passed.includes(p.id) ? '✕' : '…'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── card reveal ────────────────────────────────────────────────────────────

export function CardSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const openSheet = useGameStore((s) => s.openSheet);
  if (!state?.lastCard) return null;
  const card = CARDS_BY_ID[state.lastCard.cardId];

  return (
    <div className="flex min-h-[58dvh] flex-col items-center justify-center p-5">
      <motion.div
        initial={{ rotateY: 90, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ perspective: 800 }}
      >
        <CardBack deck={state.lastCard.deck} size={110} label={t(state.lastCard.deck === 'chance' ? 'card.chance.title' : 'card.chest.title')} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-4 text-center"
      >
        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--ec-ink-soft)]">
          {t(state.lastCard.deck === 'chance' ? 'card.chance.title' : 'card.chest.title')}
        </h2>
        <p className="mt-2 max-w-xs text-lg font-black leading-snug">{t(card.titleKey)}</p>
      </motion.div>
      <button className="ec-btn ec-btn-primary mt-6 px-10" onClick={() => { audio.play('click'); openSheet(null); }}>
        {t('common.ok')}
      </button>
    </div>
  );
}

// ─── game log ───────────────────────────────────────────────────────────────

export function LogSheet(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const openSheet = useGameStore((s) => s.openSheet);
  if (!state) return null;
  const logs = [...state.log].reverse();

  return (
    <div className="p-4 pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">📜 {t('game.log')}</h2>
        <button className="ec-btn ec-btn-sheet min-h-9 px-3 text-xs" onClick={() => openSheet(null)}>{t('common.close')}</button>
      </div>
      <ul className="space-y-1.5">
        {logs.map((l) => {
          const player = l.playerId ? state.players.find((p) => p.id === l.playerId) : null;
          const params = { ...l.params };
          if (typeof params.space === 'string' && params.space.startsWith('space.')) {
            params.space = t(params.space);
          }
          if (typeof params.creditor === 'string' && params.creditor === 'bank') {
            params.creditor = '🏦';
          }
          return (
            <li key={l.id} className="flex items-start gap-2 rounded-xl bg-[var(--ec-surface)] p-2 text-xs shadow-sm">
              {player && <CharacterPortrait characterId={player.characterId} emotion="idle" size={22} />}
              <span className="font-semibold">{t(l.key, params as Record<string, string | number>)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
