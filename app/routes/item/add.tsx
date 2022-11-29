// backend
import { redirect, json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { db } from "~/utils/db.server";
import invariant from "tiny-invariant";
// frontend
import { Form } from "@remix-run/react";

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg`;

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get("name");
  const descr = formData.get("descr");
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
  await db.item.create({
    data: {
      name,
      descr,
      authorId: 1,
    }
  });
  return redirect("/");
};

// ...

export default function NewItem() {
  return (
    <Form method="post">
      <p>
        <label>
          Item名称:{" "}
          <input
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
          id="descr"
          rows={5}
          name="descr"
          className={`${inputClassName} font-mono`}
        />
      </p>
      <p className="text-right">
        <button
          type="submit"
          className="btn-primary"
        >
          Create Item
        </button>
      </p>
    </Form>
  );
}