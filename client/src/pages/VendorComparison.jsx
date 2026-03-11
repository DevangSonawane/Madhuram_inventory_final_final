import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowRightLeft, Loader2, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return CURRENCY_FORMATTER.format(parsed);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getLowestNetPrice = (offers = []) => {
  const prices = offers
    .map((offer) => Number(offer?.net_price))
    .filter((price) => Number.isFinite(price));
  if (prices.length === 0) return null;
  return Math.min(...prices);
};

export default function VendorComparison() {
  const { projectId } = useParams();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [groups, setGroups] = useState([]);
  const [resultCount, setResultCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasSearchQuery = debouncedSearchText.length > 0;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const fetchComparisons = useCallback(
    async (searchValue = "") => {
      setLoading(true);
      setError("");

      try {
        const params = {
          limit: 500,
          offset: 0,
        };
        if (projectId) params.project_id = Number(projectId);
        if (searchValue) params.q = searchValue;

        const result = await api.compareVendorPriceListItems(params);
        if (!result?.success) {
          setError(result?.error || "Unable to load comparison data.");
          setGroups([]);
          setResultCount(0);
          setGroupCount(0);
          return;
        }

        const payload = result.data || {};
        setGroups(Array.isArray(payload.groups) ? payload.groups : []);
        setResultCount(Number(payload.count) || 0);
        setGroupCount(Number(payload.groups_count) || 0);
        setLastUpdated(new Date());
      } catch {
        setError("Unable to load comparison data.");
        setGroups([]);
        setResultCount(0);
        setGroupCount(0);
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!hasSearchQuery) {
      setGroups([]);
      setResultCount(0);
      setGroupCount(0);
      setError("");
      setLoading(false);
      setLastUpdated(null);
      return;
    }
    fetchComparisons(debouncedSearchText);
  }, [debouncedSearchText, fetchComparisons, hasSearchQuery]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aName = String(a?.items_name || a?.product_name || "").toLowerCase();
      const bName = String(b?.items_name || b?.product_name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [groups]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-slate-50 via-cyan-50 to-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Price List Comparison</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search items once and compare latest vendor offers from active price lists.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchComparisons(debouncedSearchText)}
            disabled={loading || !hasSearchQuery}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Use one search bar to query compare API results across vendors.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="pl-9"
              placeholder="Search by item name, product name, code, category, HSN, size..."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Items: {resultCount}</Badge>
            <Badge variant="outline">Groups: {groupCount}</Badge>
            <Badge variant="outline">Project: {projectId || "All"}</Badge>
            <Badge variant="outline">Status: active</Badge>
            <Badge variant="outline">
              Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading comparison results...
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && !hasSearchQuery ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Search To Compare The Price
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && hasSearchQuery && sortedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No matching items found for this search.
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && hasSearchQuery && sortedGroups.length > 0
        ? sortedGroups.map((group, groupIndex) => {
            const offers = Array.isArray(group.offers) ? group.offers : [];
            const sortedOffers = [...offers].sort((a, b) => {
              const aPrice = Number(a?.net_price);
              const bPrice = Number(b?.net_price);
              if (!Number.isFinite(aPrice) && !Number.isFinite(bPrice)) return 0;
              if (!Number.isFinite(aPrice)) return 1;
              if (!Number.isFinite(bPrice)) return -1;
              return aPrice - bPrice;
            });
            const lowestNetPrice = getLowestNetPrice(sortedOffers);

            return (
              <Card key={`${group.compare_key || "group"}-${groupIndex}`}>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-xl">{group.items_name || group.product_name || "Unnamed Item"}</CardTitle>
                      <CardDescription>
                        {group.product_name || "-"} | {group.category || "-"} | Code: {group.item_code || "-"} | HSN:{" "}
                        {group.hsn_code || "-"} | Inch: {group.size_inch || "-"} | MM: {group.size_mm || "-"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1">
                        <ArrowRightLeft className="h-3.5 w-3.5" /> {sortedOffers.length} offers
                      </Badge>
                      <Badge variant="outline">Lowest Net: {formatPrice(lowestNetPrice)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead className="text-right">Price/Pic</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Net Price</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOffers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No offers in this group.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedOffers.map((offer, offerIndex) => {
                          const netPrice = Number(offer?.net_price);
                          const isLowest =
                            Number.isFinite(netPrice) && Number.isFinite(lowestNetPrice) && netPrice === lowestNetPrice;

                          return (
                            <TableRow key={`${offer.vendor_id || "vendor"}-${offer.price_list_id || "list"}-${offer.item_id || offerIndex}`} className={isLowest ? "bg-emerald-50/70" : ""}>
                              <TableCell>
                                <div className="font-medium">{offer.vendor_name || "-"}</div>
                                <div className="text-xs text-muted-foreground">{offer.vendor_company_name || "-"}</div>
                              </TableCell>
                              <TableCell>{offer.project_id ?? "-"}</TableCell>
                              <TableCell>
                                <div className="font-medium">{offer.version_name || "-"}</div>
                                <div className="text-xs text-muted-foreground">Status: {offer.price_list_status || "-"}</div>
                              </TableCell>
                              <TableCell className="text-right">{formatPrice(offer.price_per_pic)}</TableCell>
                              <TableCell className="text-right">{formatPrice(offer.discount_price)}</TableCell>
                              <TableCell className={`text-right font-semibold ${isLowest ? "text-emerald-700" : ""}`}>
                                {formatPrice(offer.net_price)}
                              </TableCell>
                              <TableCell>{formatDateTime(offer.price_list_created_at)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        : null}
    </div>
  );
}
