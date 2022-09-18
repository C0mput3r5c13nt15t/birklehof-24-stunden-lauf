import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/layout';
import AccessDenied from '../../components/accessDenied';
import { prisma } from '../../../prisma';
import { Runner, Lap } from '@prisma/client';
import { IoTrashOutline } from 'react-icons/io5';
import { useToasts } from 'react-toast-notifications';

interface RunnerWithGroupAndLapsCount extends Runner {
  _count: {
    laps: number;
  };
}

export async function getServerSideProps(_context: any) {
  let runners = await prisma.runner.findMany({
    include: {
      _count: {
        select: {
          laps: true
        }
      }
    },
    orderBy: {
      number: 'asc'
    }
  });
  runners = JSON.parse(JSON.stringify(runners));
  return { props: { runners } };
}

export default function IndexRunnerPage({ initRunners }: { initRunners: RunnerWithGroupAndLapsCount[] }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const [runners, setRunners] = useState(initRunners);
  const { addToast } = useToasts();

  // Fetch users from protected route
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/runners');
      if (res.status === 200) {
        const json = await res.json();
        setRunners(json.data);
      } else {
        addToast('Ein Fehler ist aufgeregteren', {
          appearance: 'error',
          autoDismiss: true
        });
      }
    };
    fetchData();
  }, [addToast, session]);

  const handleDelete = async (number: number) => {
    const res = await fetch(`/api/runners/${number}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (res.status === 200) {
      const newContent = runners.filter((runner) => runner.number !== number);
      setRunners(newContent);
      addToast('Läufer erfolgreich gelöscht', {
        appearance: 'success',
        autoDismiss: true
      });
    } else if (res.status === 403) {
      addToast('Fehlende Berechtigung', {
        appearance: 'error',
        autoDismiss: true
      });
    } else if (res.status === 404) {
      addToast('Läufer nicht gefunden', {
        appearance: 'error',
        autoDismiss: true
      });
    } else {
      addToast('Ein Fehler ist aufgeregteren', {
        appearance: 'error',
        autoDismiss: true
      });
    }
  };

  // When rendering client side don't display anything until loading is complete
  if (typeof window !== 'undefined' && loading) return null;

  // If the user is not authenticated or does not have the correct role, display access denied message
  if (!session || (session.userRole !== 'helper' && session.userRole !== 'superadmin')) {
    return (
      <Layout>
        <AccessDenied />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card w-11/12 max-w-4xl h-full bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Läufer</h2>
          <div className="overflow-x-auto">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>Startnummer</th>
                  <th>Vorname</th>
                  <th>Nachname</th>
                  <th>Klasse</th>
                  <th>Haus</th>
                  <th>Runden</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {runners &&
                  runners.map((runner) => (
                    <tr key={runner.number}>
                      <th>{runner.number}</th>
                      <td>{runner.firstName}</td>
                      <td>{runner.lastName}</td>
                      <td>{runner.grade}</td>
                      <td>{runner.house}</td>
                      <td>{runner._count.laps}</td>
                      <td>
                        <button className={'deleteButton'} onClick={() => handleDelete(runner.number)}>
                          <IoTrashOutline />
                        </button>
                      </td>
                    </tr>
                  ))}
                {runners?.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <p className="text-center text-gray-500">Keine Läufer vorhanden</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
