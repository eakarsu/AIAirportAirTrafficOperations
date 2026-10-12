import { useCallback, useEffect, useRef, useState } from 'react';

export async function readNativeRecordList(response) {
  let body;
  try { body = await response.json(); }
  catch { throw new Error('The records service returned an unreadable response. Sign in again or retry.'); }
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Records request failed (${response.status}).`);
  const items = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(items)) throw new Error('The records service returned an invalid list.');
  const pagination = Array.isArray(body) ? null : body.pagination;
  if (pagination && (!Number.isInteger(pagination.page) || pagination.page < 1 || !Number.isInteger(pagination.totalPages) || pagination.totalPages < 0)) throw new Error('The records service returned invalid pagination.');
  return { items, pagination };
}

export default function useNativeRecordList({ url, token, onLoad }) {
  const pending = useRef(null), receive = useRef(onLoad);
  receive.current = onLoad;
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError('');
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      const data = await readNativeRecordList(response);
      if (pending.current === controller && !controller.signal.aborted) receive.current(data);
    } catch (failure) {
      if (pending.current === controller && !controller.signal.aborted) setError(failure.message || 'Could not reach the records service.');
    } finally {
      if (pending.current === controller && !controller.signal.aborted) { pending.current = null; setLoading(false); }
    }
  }, [url, token]);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [url, token]);
  return { loading, error, reload };
}
