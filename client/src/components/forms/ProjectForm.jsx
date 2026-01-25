import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, FileText } from "lucide-react";
import { api } from "@/lib/api";

export default function ProjectForm({ project, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    project_name: '',
    product_duration: '',
    client_name: '',
    work_order_information: '',
    pr_po_tracking: [],
    samples: [],
    ml_management: {
      ml_task: ''
    }
  });

  const [files, setFiles] = useState({
    work_order_file: null,
    mas_file: null
  });

  const [filePreviews, setFilePreviews] = useState({
    work_order_file: null,
    mas_file: null
  });

  const [prPoInput, setPrPoInput] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project) {
      setFormData({
        project_name: project.project_name || '',
        product_duration: project.product_duration || '',
        client_name: project.client_name || '',
        work_order_information: project.work_order_information || '',
        pr_po_tracking: project.pr_po_tracking || [],
        samples: project.samples || [],
        ml_management: project.ml_management || { ml_task: '' }
      });

      // Set file previews for existing files
      if (project.work_order_file) {
        setFilePreviews(prev => ({
          ...prev,
          work_order_file: api.getFileUrl(project.work_order_file)
        }));
      }
      if (project.mas_file) {
        setFilePreviews(prev => ({
          ...prev,
          mas_file: api.getFileUrl(project.mas_file)
        }));
      }
    }
  }, [project]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'ml_task') {
      setFormData(prev => ({
        ...prev,
        ml_management: {
          ...prev.ml_management,
          ml_task: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      setFilePreviews(prev => ({
        ...prev,
        [fileType]: URL.createObjectURL(file)
      }));
    }
  };

  const removeFile = (fileType) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    setFilePreviews(prev => ({
      ...prev,
      [fileType]: null
    }));
  };

  const addPrPo = () => {
    if (prPoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        pr_po_tracking: [...prev.pr_po_tracking, prPoInput.trim()]
      }));
      setPrPoInput('');
    }
  };

  const removePrPo = (index) => {
    setFormData(prev => ({
      ...prev,
      pr_po_tracking: prev.pr_po_tracking.filter((_, i) => i !== index)
    }));
  };

  const addSample = () => {
    if (sampleInput.trim()) {
      setFormData(prev => ({
        ...prev,
        samples: [...prev.samples, sampleInput.trim()]
      }));
      setSampleInput('');
    }
  };

  const removeSample = (index) => {
    setFormData(prev => ({
      ...prev,
      samples: prev.samples.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        work_order_file: files.work_order_file,
        mas_file: files.mas_file
      };

      let result;
      if (project?.project_id) {
        result = await api.updateProject(project.project_id, submitData);
      } else {
        result = await api.createProject(submitData);
      }

      if (result.success) {
        onSuccess?.(result.data);
      } else {
        setError(result.error || 'Failed to save project');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_name">Project Name *</Label>
          <Input
            id="project_name"
            name="project_name"
            value={formData.project_name}
            onChange={handleInputChange}
            required
            placeholder="Enter project name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_duration">Product Duration *</Label>
          <Input
            id="product_duration"
            name="product_duration"
            type="date"
            value={formData.product_duration}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_name">Client Name *</Label>
        <Input
          id="client_name"
          name="client_name"
          value={formData.client_name}
          onChange={handleInputChange}
          required
          placeholder="Enter client name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="work_order_file">Work Order File {!project && '*'}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="work_order_file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileChange(e, 'work_order_file')}
            className="flex-1"
            disabled={!!filePreviews.work_order_file && !files.work_order_file}
          />
          {filePreviews.work_order_file && (
            <div className="flex items-center gap-2">
              <a
                href={filePreviews.work_order_file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View
              </a>
              {files.work_order_file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('work_order_file')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="work_order_information">Work Order Information</Label>
        <Textarea
          id="work_order_information"
          name="work_order_information"
          value={formData.work_order_information}
          onChange={handleInputChange}
          placeholder="Enter work order details"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>PR/PO Tracking</Label>
        <div className="flex gap-2">
          <Input
            value={prPoInput}
            onChange={(e) => setPrPoInput(e.target.value)}
            placeholder="Enter PR/PO number"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPrPo();
              }
            }}
          />
          <Button type="button" onClick={addPrPo} variant="outline">
            Add
          </Button>
        </div>
        {formData.pr_po_tracking.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.pr_po_tracking.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removePrPo(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Samples</Label>
        <div className="flex gap-2">
          <Input
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            placeholder="Enter sample name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSample();
              }
            }}
          />
          <Button type="button" onClick={addSample} variant="outline">
            Add
          </Button>
        </div>
        {formData.samples.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.samples.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeSample(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mas_file">MAS File</Label>
        <div className="flex items-center gap-2">
          <Input
            id="mas_file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileChange(e, 'mas_file')}
            className="flex-1"
            disabled={!!filePreviews.mas_file && !files.mas_file}
          />
          {filePreviews.mas_file && (
            <div className="flex items-center gap-2">
              <a
                href={filePreviews.mas_file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View
              </a>
              {files.mas_file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('mas_file')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ml_task">ML Management - Task</Label>
        <Textarea
          id="ml_task"
          name="ml_task"
          value={formData.ml_management.ml_task}
          onChange={handleInputChange}
          placeholder="Enter ML task details"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
