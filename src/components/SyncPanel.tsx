import { useState } from 'react';
import { connectGist, disconnectGist, exportCode, gistConfig, importCode, startCloudSync, useCloud } from '../game/cloud';
import { useStore } from '../game/store';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=EarWise%20sync';

/** Progress sync: status, GitHub connection (outside claude.ai) and a transfer code for moving between versions. */
export function SyncPanel({ compact = false }: { compact?: boolean }) {
  const ru = useStore((s) => s.settings.lang) === 'ru';
  const { status, backend } = useCloud();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [myCode, setMyCode] = useState<string | null>(null);
  const connected = !!gistConfig()?.token;
  const L = (r: string, e: string) => (ru ? r : e);

  const statusText =
    status === 'ok'
      ? backend === 'gist'
        ? L('☁️ Прогресс синхронизируется через твой GitHub — он одинаковый на всех устройствах', '☁️ Progress syncs through your GitHub — the same on all your devices')
        : L('☁️ Прогресс сохраняется в облаке и доступен на всех твоих устройствах', '☁️ Progress is saved to the cloud and available on all your devices')
      : status === 'syncing'
        ? L('☁️ Синхронизация…', '☁️ Syncing…')
        : status === 'auth'
          ? L('⚠️ GitHub не принял токен (истёк или нет права «gist»). Подключи заново.', '⚠️ GitHub rejected the token (expired or no "gist" scope). Reconnect.')
          : status === 'error'
            ? L('⚠️ Нет связи с облаком — прогресс сохранится здесь и догонит позже', '⚠️ Cloud unreachable — progress is kept here and will catch up later')
            : L('📱 Прогресс хранится только на этом устройстве', '📱 Progress is stored on this device only');

  const connect = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const login = await connectGist(token);
      setToken('');
      setMsg(L(`✓ Подключено: ${login}. Сделай то же на других устройствах — прогресс сольётся.`, `✓ Connected as ${login}. Do the same on your other devices — progress will merge.`));
    } catch {
      setMsg(L('Не получилось: проверь токен (нужна галочка «gist»).', 'That didn’t work: check the token (needs the "gist" scope).'));
    }
    setBusy(false);
  };

  const doImport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await importCode(code);
      setCode('');
      setMsg(L('✓ Прогресс перенесён и объединён с этим устройством', '✓ Progress imported and merged into this device'));
    } catch {
      setMsg(L('Код не распознан — скопируй его целиком', 'Code not recognised — copy it whole'));
    }
    setBusy(false);
  };

  const doExport = async () => {
    const c = await exportCode();
    setMyCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg(L('✓ Код скопирован — вставь его в другой версии приложения', '✓ Code copied — paste it into the other version of the app'));
    } catch {
      setMsg(L('Скопируй код из поля ниже', 'Copy the code from the box below'));
    }
  };

  return (
    <div className="sync">
      <p className="small">{statusText}</p>

      {backend !== 'claude' && (
        <>
          {connected ? (
            <div className="row gap wrap">
              {(status === 'error' || status === 'auth') && (
                <button className="btn ghost small" onClick={() => void startCloudSync()}>
                  ↻ {L('Повторить', 'Retry')}
                </button>
              )}
              <button className="btn ghost small" onClick={disconnectGist}>
                {L('Отключить GitHub на этом устройстве', 'Disconnect GitHub on this device')}
              </button>
            </div>
          ) : (
            <details className="sync-box" open={compact}>
              <summary>🔗 {L('Синхронизация через GitHub', 'Sync via GitHub')}</summary>
              <ol className="small sync-steps">
                <li>
                  {L('Открой ', 'Open ')}
                  <a href={TOKEN_URL} target="_blank" rel="noreferrer">
                    {L('создание токена GitHub', 'GitHub token page')}
                  </a>
                  {L(' — галочка «gist» уже стоит. Срок можно поставить «No expiration».', ' — the "gist" box is pre-ticked. Expiration can be "No expiration".')}
                </li>
                <li>{L('Нажми «Generate token», скопируй его и вставь сюда.', 'Click "Generate token", copy it and paste it here.')}</li>
              </ol>
              <div className="row gap">
                <input className="input" type="password" autoComplete="off" placeholder="ghp_…" value={token} onChange={(e) => setToken(e.target.value)} />
                <button className="btn primary small" disabled={busy || token.trim().length < 20} onClick={connect}>
                  {L('Подключить', 'Connect')}
                </button>
              </div>
              <p className="muted small">
                {L('Прогресс хранится в твоём секретном Gist. Токен остаётся только на этом устройстве и даёт доступ лишь к Gist.', 'Progress is kept in your own secret Gist. The token stays on this device and only grants Gist access.')}
              </p>
            </details>
          )}
        </>
      )}

      <details className="sync-box">
        <summary>🔁 {L('Перенос кодом (между версиями)', 'Transfer code (between versions)')}</summary>
        <p className="muted small">
          {L('Скопируй код в одной версии приложения и вставь в другой — прогресс объединится, ничего не потеряется.', 'Copy the code in one version of the app and paste it into the other — progress merges, nothing is lost.')}
        </p>
        <button className="btn ghost small" onClick={doExport}>
          📋 {L('Скопировать мой код', 'Copy my code')}
        </button>
        {myCode && <textarea className="input code" readOnly value={myCode} onFocus={(e) => e.currentTarget.select()} />}
        <textarea className="input code" placeholder={L('Вставь код сюда (EW1:…)', 'Paste a code here (EW1:…)')} value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn primary small" disabled={busy || !code.trim()} onClick={doImport}>
          {L('Перенести прогресс', 'Import progress')}
        </button>
      </details>

      {msg && <p className="small sync-msg">{msg}</p>}
    </div>
  );
}
