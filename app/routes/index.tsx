// backend imports
import { json } from '@remix-run/node'; // or "@remix-run/cloudflare"
import { db } from '~/utils/db.server';
import type { Item } from "@prisma/client";

// frontend imports
import { useLoaderData } from '@remix-run/react';
import { Link } from '~/components';

type LoaderData = Awaited<ReturnType<typeof getItems>>;

function getItems() {
  return  db.item.findMany({
    orderBy: { createdAt: 'asc' },
    include: { author: true }
  })
}

export const loader = async () => {
  return json<LoaderData>(await getItems());
};

export default function Index() {
  const items = useLoaderData<LoaderData>();

  return (
    <div className="m-auto my-6 max-w-4xl">
      <div className="mb-2">
        <Link to="/item/add"><button className="btn-primary">新增条目</button></Link>
      </div>
      <h1 className="text-lg uppercase mt-4 mb-2 font-bold">条目列表</h1>
      <table className="table">
        <thead>
          <tr>
            <td style={{ width: 50 }}>序号</td>
            <td style={{ width: 150 }}>名称</td>
            <td>描述</td>
            <td>其他信息</td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <Link to={`/item/${item.id}`} className="text-blue-500">
                    {item.name}
                  </Link>
                </td>
                <td className="">{item.descr}</td>
                <td className="">
                  <dl className="text-xs text-slate-500">
                    <dt>{item.author.name} 创建于 {item.createdAt}</dt>
                    <dt>{item.author.name} 更新于 {item.updatedAt}</dt>
                  </dl>
                </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
