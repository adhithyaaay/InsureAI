import type { Dispatch, SetStateAction } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormErrors, InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  setFormData: Dispatch<SetStateAction<InsuranceFormData>>;
  errors?: FormErrors;
}

export default function InsuranceForm({
  formData,
  setFormData,
  errors = {},
}: Props) {
  return (
    <div className="flex justify-center py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            Customer Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Age */}
          <div>
            <Label className="mb-2 block font-medium">Age</Label>
            <Input
              type="number"
              placeholder="Enter your age (e.g. 30)"
              value={formData.age === "" ? "" : formData.age}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  age: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className={errors.age ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.age && (
              <p className="text-sm text-red-500 mt-1.5">{errors.age}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <Label className="mb-2 block font-medium">Gender</Label>
            <Select
              value={
                formData.sex === 1
                  ? "male"
                  : formData.sex === 0
                  ? "female"
                  : ""
              }
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  sex: value === "male" ? 1 : value === "female" ? 0 : null,
                })
              }
            >
              <SelectTrigger className={`w-full ${errors.sex ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex && (
              <p className="text-sm text-red-500 mt-1.5">{errors.sex}</p>
            )}
          </div>

          {/* BMI */}
          <div>
            <Label className="mb-2 block font-medium">BMI (Body Mass Index)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="Enter your BMI (e.g. 24.5)"
              value={formData.bmi === "" ? "" : formData.bmi}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bmi: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className={errors.bmi ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.bmi && (
              <p className="text-sm text-red-500 mt-1.5">{errors.bmi}</p>
            )}
          </div>

          {/* Children */}
          <div>
            <Label className="mb-2 block font-medium">
              Number of Children
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="Enter number of children (e.g. 0)"
              value={formData.children === "" ? "" : formData.children}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  children: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className={errors.children ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.children && (
              <p className="text-sm text-red-500 mt-1.5">{errors.children}</p>
            )}
          </div>

          {/* Smoker */}
          <div>
            <Label className="mb-2 block font-medium">Smoker Status</Label>
            <Select
              value={
                formData.smoker === 1
                  ? "yes"
                  : formData.smoker === 0
                  ? "no"
                  : ""
              }
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  smoker: value === "yes" ? 1 : value === "no" ? 0 : null,
                })
              }
            >
              <SelectTrigger className={`w-full ${errors.smoker ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                <SelectValue placeholder="Do you smoke?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
            {errors.smoker && (
              <p className="text-sm text-red-500 mt-1.5">{errors.smoker}</p>
            )}
          </div>

          {/* Region */}
          <div>
            <Label className="mb-2 block font-medium">US Region</Label>
            <Select
              value={formData.region}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  region: value ?? "",
                })
              }
            >
              <SelectTrigger className={`w-full ${errors.region ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="northeast">Northeast</SelectItem>
                <SelectItem value="northwest">Northwest</SelectItem>
                <SelectItem value="southeast">Southeast</SelectItem>
                <SelectItem value="southwest">Southwest</SelectItem>
              </SelectContent>
            </Select>
            {errors.region && (
              <p className="text-sm text-red-500 mt-1.5">{errors.region}</p>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}