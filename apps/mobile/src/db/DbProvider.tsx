import { migrate, type SqlDatabase, type SqlValue } from '@ggookggook/store';
import * as SQLite from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Colors } from '@/theme';
import { space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { Txt } from '@/ui/Txt';

const DbContext = createContext<SqlDatabase | null>(null);

function adapt(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync(source: string) {
      return db.execAsync(source);
    },
    runAsync(source: string, params: SqlValue[]) {
      return db.runAsync(source, params);
    },
    getFirstAsync<T>(source: string, params: SqlValue[]) {
      return db.getFirstAsync<T>(source, params);
    },
    getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.getAllAsync<T>(source, params);
    },
  };
}

export function DbProvider({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const [db, setDb] = useState<SqlDatabase | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = adapt(await SQLite.openDatabaseAsync('ggookggook.db'));
        await migrate(opened);
        if (!cancelled) setDb(opened);
      } catch (error) {
        console.error('Failed to open the local database', error);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <View style={styles.center}>
        <Txt variant="body">기록을 저장할 공간을 열지 못했어요. 앱을 다시 실행해 주세요.</Txt>
      </View>
    );
  }
  if (!db) return null;
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): SqlDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside DbProvider');
  return db;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(8), backgroundColor: colors.bg },
  });
