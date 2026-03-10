import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_ITEM = { name: "", description: "", width: "", length: "", quantity: "", price: "" };

const hasItemValue = (item) => {
  if (!item) return false;
  return ["name", "description", "width", "length", "quantity", "price"].some((key) => {
    const value = item[key];
    return value != null && String(value).trim() !== "";
  });
};

const mapPoItemToHalfDelivery = (item, index) => {
  const parsedQty = Number(item?.quantity);
  return {
    name: item?.name || item?.description || `Item ${index + 1}`,
    description: item?.description || "",
    width: item?.width || "",
    length: item?.length || "",
    quantity: Number.isFinite(parsedQty) ? String(parsedQty / 2) : "",
    price: item?.price || ""
  };
};

const mapPoItemsToHalfDelivery = (poItems) => {
  if (!Array.isArray(poItems) || poItems.length === 0) return [{ ...EMPTY_ITEM }];
  return poItems.map((item, index) => mapPoItemToHalfDelivery(item, index));
};

export default function ChallanItemDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  const poItems = Array.isArray(location.state?.poItems) ? location.state.poItems : [];
  const returnPath = location.state?.returnPath || `/${projectId}/challans/new`;

  const [deliveryItems, setDeliveryItems] = useState(() => {
    const incoming = Array.isArray(location.state?.deliveryItems) ? location.state.deliveryItems : [];
    const meaningful = incoming.filter(hasItemValue);
    if (meaningful.length > 0) return incoming;
    return mapPoItemsToHalfDelivery(poItems);
  });

  const updateDeliveryItem = (index, field, value) => {
    setDeliveryItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeDeliveryItem = (index) => {
    setDeliveryItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ ...EMPTY_ITEM }];
    });
  };

  const addBlankDeliveryItem = () => {
    setDeliveryItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  };

  const addPoItemToDelivery = (item, index) => {
    setDeliveryItems((prev) => [...prev, mapPoItemToHalfDelivery(item, index)]);
  };

  const applyAndReturn = () => {
    navigate(returnPath, { state: { deliveryItems } });
  };

  const backToChallan = () => {
    navigate(returnPath, { state: { deliveryItems } });
  };

  return (
    <div className="min-h-screen w-full max-w-none space-y-6 bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challan Item Detail</h1>
          <p className="mt-2 text-muted-foreground">Left: PO Items. Right: Delivery Items. Add or edit delivery lines and apply.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={backToChallan}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="button" onClick={applyAndReturn}>
            Apply to Challan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PO Items (50% Screen)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {poItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No PO items available. Go back and select a PO first.
              </div>
            ) : (
              poItems.map((item, index) => (
                <div key={`po-item-detail-${index}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{item.name || `Item ${index + 1}`}</div>
                      <div className="text-sm text-muted-foreground">{item.description || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        W: {item.width || "-"} | L: {item.length || "-"} | Qty: {item.quantity || "-"} | Price: {item.price || "-"}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => addPoItemToDelivery(item, index)}>
                      Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Delivery Items (50% Screen)</CardTitle>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addBlankDeliveryItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Row
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryItems.map((item, index) => (
              <div key={`delivery-item-detail-${index}`} className="grid grid-cols-1 gap-2 rounded-lg border p-3">
                <Input
                  className="h-10 text-sm"
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) => updateDeliveryItem(index, "name", e.target.value)}
                />
                <Textarea
                  className="text-sm"
                  rows={2}
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateDeliveryItem(index, "description", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="h-10 text-sm"
                    placeholder="Width"
                    value={item.width}
                    onChange={(e) => updateDeliveryItem(index, "width", e.target.value)}
                  />
                  <Input
                    className="h-10 text-sm"
                    placeholder="Length"
                    value={item.length}
                    onChange={(e) => updateDeliveryItem(index, "length", e.target.value)}
                  />
                  <Input
                    className="h-10 text-sm"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) => updateDeliveryItem(index, "quantity", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      className="h-10 text-sm"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => updateDeliveryItem(index, "price", e.target.value)}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => removeDeliveryItem(index)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
