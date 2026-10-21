import ResumeManager from "../components/ResumeManager";
import useData from "../hooks/useData";

export default function ResumesPage() {
  const { resumes, uploadResume, deleteResume } = useData();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Resumes</h1>
          <p className="page-subtitle">
            Upload each version you send out, then link them to applications.
          </p>
        </div>
      </header>
      <ResumeManager resumes={resumes} onUpload={uploadResume} onDelete={deleteResume} />
    </div>
  );
}