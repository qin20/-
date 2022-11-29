// backend
import { redirect, json, LoaderFunction } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { db } from "~/utils/db.server";
import invariant from "tiny-invariant";
// frontend
import { Form, useFetcher, useLoaderData, useLocation, useSubmit } from "@remix-run/react";
import { Item, Timeline } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1`;

type LoaderData = Awaited<ReturnType<typeof getItem>> | null | undefined;

function sort(timeline: Timeline[]) {
  return [...timeline.sort((a, b) => {
    return new Date(b.start).getTime() - new Date(a.start).getTime();
  })];
}

function toDate(time: string) {
  return time.replace(/(-?)(\d+)-?(\d{2})?-?(\d{2})?\s*(\d{2})?:?(\d{2})?:?(\d{2})?/, (
    m, sign, year, month, day, hour, minus, second
  ) => {
    for (let i = year.length; i < 6; i++) {
      year = `0${year}`;
    }
    for (let i = year.length; i > 6; i--) {
      year = year.substr(1);
    }
    return `${sign}${[year, month || '01', day || '01'].join('-')} ${[hour || '00', minus || '00', second || '00'].join(':')}`;
  });
}

function getItem(id: number) {
  return db.item.findUnique({
    where: { id },
    include: { timeline: { orderBy: { start: 'asc' }} }
  });
}

export const loader: LoaderFunction = async ({ params }) => {
    const { id } = params;
    let item;
    if (id) {
        item = await getItem(+id);
    }
    return json<LoaderData>(item);
}

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const id = !params.id || isNaN(+params.id) ? undefined : +params.id;
  const name = formData.get("name");
  const descr = formData.get("descr");
  const timeline = JSON.parse(formData.get("timeline") as string) as Timeline[];
  const errors = {
    name: name ? null : "Title is required",
    descr: descr ? null : "Slug is required",
  };
  const hasErrors = Object.values(errors).some(
    (errorMessage) => errorMessage
  );
  if (hasErrors) {
    return json(errors);
  }
  invariant(
    typeof name === "string",
    "title must be a string"
  );
  invariant(
    typeof descr === "string",
    "slug must be a string"
  );
  await db.$transaction(async (tx) => {
    const item = await tx.item.upsert({
      where: { id: id },
      update: {
        name,
        descr,
      },
      create: {
        name,
        descr,
        authorId: 1,
      },
    });
    if (timeline && timeline.length) {
      await tx.timeline.deleteMany({ where: { itemId: item.id } }),
      await tx.timeline.createMany({ data: timeline.map(({id, ...tl}) => ({
        ...tl,
        itemId: item.id,
      })) });
    }
  });
  return null;
};

function TimelineForm({
  data,
  onSave,
  onCancel,
}: {
  data: Timeline,
  onSave?: (data: {start: string; what: string;}) => void;
  onCancel?: () => void;
}) {
  return (
    <Form className="space-y-2">
      <p>
        <label>
          <input
            defaultValue={data.start}
            type="text"
            name="start"
            className={inputClassName}
          />
        </label>
      </p>
      <p>
        <textarea
          defaultValue={data?.what || ''}
          rows={6}
          name="what"
          className={`${inputClassName} font-mono`}
        />
      </p>
      <p className="my-2">
        <button
          type="button"
          className="btn-primary btn-xs mr-2"
          onClick={onSave && (
            (event) => {
              event.preventDefault();
              const form = (event.target as HTMLButtonElement).closest('form') as HTMLFormElement;
              const formData = new FormData(form);
              onSave({
                start: formData.get('start') as string || new Date().toISOString(),
                what: formData.get('what') as string,
              });
            }
          )}
        >
          Save
        </button>
        <button
          type="button"
          className="btn-primary btn-xs"
          onClick={onCancel}
        >
          Cancel
        </button>
      </p>
    </Form>
  );
}

export default function Item() {
  const item = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null)
  const [timeline, setTimeline] = useState<Timeline[]>(sort((item?.timeline || []).map((tl) => ({
    ...tl, start: toDate(tl.start),
  }))));
  const [editingTimelineId, setEditingTimlineId] = useState<number>();

  const submit = (timeline: Timeline[] = []) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.append('timeline', JSON.stringify(timeline));
    fetcher.submit(
      formData, //Notice this change
      { method: "post" }
    );
  };

  return (
    <div className="max-w-4xl m-auto">
      <fetcher.Form ref={formRef} method="post" className="space-y-2">
        <input type="hidden" name="id" value={item?.id} />
        <p>
          <label>
            Item名称:{" "}
            <input
              defaultValue={item?.name}
              type="text"
              name="name"
              className={inputClassName}
            />
          </label>
        </p>
        <p>
          <label htmlFor="descr">描述:</label>
          <br />
          <textarea
            defaultValue={item?.descr || ''}
            id="descr"
            rows={3}
            name="descr"
            className={`${inputClassName} font-mono`}
          />
        </p>
        <p className="mt-2">
          <button
            type="submit"
            className="btn-primary"
          >
            Save
          </button>
        </p>
        <br />
        <div className="uppercase">
          <b>timeline</b>
          <button type="button" className="btn-primary btn-xs ml-4" onClick={() => {
            const id = Math.random() * Date.now();
            setTimeline([{ ...timeline[0], id: id }, ...timeline]);
            setEditingTimlineId(id);
          }}>Add</button>
          <button className="btn-primary btn-xs ml-2" onClick={() => {
            setTimeline(sort(timeline));
          }}>Sort</button>
        </div>
        <ul className="space-y-2 divide-y">
          {timeline.map((tl) => {
            return (
              <li key={tl.id} className="pt-2">
                {tl.id === editingTimelineId ? (
                  <TimelineForm
                    data={tl}
                    onSave={(data) => {
                      const newTimeline = timeline.map((ttl) => {
                        if (ttl.id === tl.id) {
                          return {...ttl, ...data, start: toDate(data.start) };
                        }
                        return {...ttl};
                      })
                      setTimeline(newTimeline);
                      setEditingTimlineId(undefined);
                      submit(newTimeline);
                    }}
                    onCancel={() => setEditingTimlineId(undefined)}
                  ></TimelineForm>
                ) : (
                  <>
                    <div>
                      <time className="text-gray-500">{tl.start}</time>
                      <span
                        className="text-blue-500 text-xs ml-2 cursor-pointer hover:text-blue-700"
                        onClick={() => setEditingTimlineId(tl.id)}
                      >Edit</span>
                      <span
                        className="text-red-500 text-xs ml-2 cursor-pointer hover:text-red-700"
                        onClick={() => {
                          const newTimeline = timeline.filter((d) => d.id !== tl.id)
                          setTimeline(newTimeline);
                        }}
                      >Del</span>
                    </div>
                    <div className="leading-5 whitespace-pre-wrap">{tl.what}</div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </fetcher.Form>
    </div>
  );
}